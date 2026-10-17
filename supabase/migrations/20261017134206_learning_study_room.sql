-- Subject study sessions: private answer bank, server scoring and exactly-once rewards.
-- Additive to the existing player progression; no client writes to results or currency.
begin;

create table private.study_question_bank (
  key text primary key,
  course_id text not null,
  prompt text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 8),
  answer integer not null check (answer >= 0 and answer < jsonb_array_length(options)),
  explain text not null
);
create index study_bank_course on private.study_question_bank(course_id);
alter table private.study_question_bank enable row level security;
revoke all on private.study_question_bank from public, anon, authenticated;

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  question_keys text[] not null check (cardinality(question_keys) = 5),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  result jsonb
);
create index study_sessions_owner on public.study_sessions(user_id, created_at desc);
alter table public.study_sessions enable row level security;
revoke all on public.study_sessions from public, anon, authenticated;
grant select on public.study_sessions to authenticated;
create policy "own study sessions" on public.study_sessions for select to authenticated using (user_id = (select auth.uid()));

create table public.study_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sessions integer not null default 0 check (sessions >= 0),
  correct integer not null default 0 check (correct >= 0),
  total integer not null default 0 check (total >= correct),
  courses text[] not null default '{}',
  last_studied_at timestamptz,
  reward_day date,
  rewarded_today integer not null default 0 check (rewarded_today between 0 and 10)
);
alter table public.study_progress enable row level security;
revoke all on public.study_progress from public, anon, authenticated;
grant select on public.study_progress to authenticated;
create policy "own study progress" on public.study_progress for select to authenticated using (user_id = (select auth.uid()));
grant all on public.study_sessions, public.study_progress, private.study_question_bank to service_role;

-- Privileged operations remain in the non-exposed private schema. The public
-- invoker wrappers expose only the two narrow authenticated operations.
create function private.study_start_session(p_course text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); keys text[]; sid uuid; questions jsonb;
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  -- Serialize starts per player so concurrent requests cannot bypass rate limits.
  insert into public.player_stats(user_id) values(uid) on conflict do nothing;
  perform 1 from public.player_stats where user_id=uid for update;
  if (select count(*) from public.study_sessions where user_id=uid and created_at > now()-interval '1 hour') >= 60 then
    raise exception 'rate_limited';
  end if;
  select array_agg(key) into keys from (select key from private.study_question_bank where course_id=p_course order by random() limit 5) q;
  if coalesce(cardinality(keys),0) <> 5 then raise exception 'unknown_course'; end if;
  insert into public.study_sessions(user_id,course_id,question_keys) values(uid,p_course,keys) returning id into sid;
  select jsonb_agg(jsonb_build_object('key',b.key,'prompt',b.prompt,'options',b.options) order by k.n)
    into questions from unnest(keys) with ordinality k(key,n) join private.study_question_bank b on b.key=k.key;
  return jsonb_build_object('id',sid,'courseId',p_course,'questions',questions);
end $$;

create function private.study_submit_session(p_session uuid, p_answers integer[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); s public.study_sessions%rowtype; p public.study_progress%rowtype;
  n integer := 0; reviewed jsonb; v_result jsonb; v_xp integer := 0; v_clout integer := 0; today date := private.london_today();
begin
  if uid is null or not private.is_active_member() then raise exception 'not_allowed'; end if;
  select * into s from public.study_sessions where id=p_session and user_id=uid for update;
  if not found then raise exception 'session_unavailable'; end if;
  -- A retried response never awards XP, Clout or session credit twice.
  if s.completed_at is not null then return s.result; end if;
  if s.created_at < now()-interval '24 hours' then raise exception 'session_unavailable'; end if;
  if p_answers is null or cardinality(p_answers) <> 5 or array_ndims(p_answers) <> 1 or array_lower(p_answers,1) <> 1 then raise exception 'invalid_answers'; end if;
  if exists (
    select 1 from unnest(s.question_keys) with ordinality k(key,i) join private.study_question_bank b on b.key=k.key
    where p_answers[k.i] is null or p_answers[k.i] < 0 or p_answers[k.i] >= jsonb_array_length(b.options)
  ) then raise exception 'invalid_answers'; end if;
  select count(*) filter(where b.answer=p_answers[k.i]),
    jsonb_agg(jsonb_build_object('answer',b.answer,'explain',b.explain) order by k.i)
    into n,reviewed from unnest(s.question_keys) with ordinality k(key,i) join private.study_question_bank b on b.key=k.key;
  -- One row lock serializes the daily cap and the shared game wallet.
  perform 1 from public.player_stats where user_id=uid for update;
  insert into public.study_progress(user_id) values(uid) on conflict do nothing;
  select * into p from public.study_progress where user_id=uid for update;
  if p.reward_day is distinct from today then p.rewarded_today := 0; end if;
  if p.rewarded_today < 10 then v_xp := 10+n*5; v_clout := n*5; end if;
  update public.player_stats set
    xp=player_stats.xp+v_xp,
    clout=player_stats.clout+v_clout,
    level=greatest(1,floor((1+sqrt(1+0.08*(player_stats.xp+v_xp)))/2)::integer),
    updated_at=now() where user_id=uid;
  update public.study_progress set sessions=sessions+1, correct=correct+n, total=total+5,
    courses=case when s.course_id=any(courses) then courses else array_append(courses,s.course_id) end,
    last_studied_at=now(), reward_day=today, rewarded_today=least(10,p.rewarded_today+1) where user_id=uid;
  v_result := jsonb_build_object('correct',n,'total',5,'xp',v_xp,'clout',v_clout,'answers',reviewed);
  update public.study_sessions set completed_at=now(),result=v_result where id=s.id;
  return v_result;
end $$;

create function public.study_start_session(p_course text) returns jsonb
language sql security invoker set search_path = '' as $$ select private.study_start_session(p_course); $$;
create function public.study_submit_session(p_session uuid, p_answers integer[]) returns jsonb
language sql security invoker set search_path = '' as $$ select private.study_submit_session(p_session,p_answers); $$;
revoke all on function private.study_start_session(text), private.study_submit_session(uuid,integer[]), public.study_start_session(text), public.study_submit_session(uuid,integer[]) from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.study_start_session(text), private.study_submit_session(uuid,integer[]), public.study_start_session(text), public.study_submit_session(uuid,integer[]) to authenticated;

-- The original, reviewed question bank is seeded below by the checked-in script.
-- BEGIN STUDY BANK
insert into private.study_question_bank (key,course_id,prompt,options,answer,explain) values
  ('gcse-maths-percentages:pc1','gcse-maths','What is 15% of 80?','["8","12","15","20"]',1,'10% of 80 is 8 and 5% is 4, so 15% is 12.'),
  ('gcse-maths-percentages:pc2','gcse-maths','Which multiplier increases an amount by 3.5%?','["0.965","1.35","1.035","3.5"]',2,'100% + 3.5% = 103.5% = 1.035.'),
  ('gcse-maths-percentages:pc3','gcse-maths','After a 25% increase a ticket costs £30. What was the original price?','["£22.50","£24","£25","£37.50"]',1,'Original × 1.25 = 30, so original = 30 ÷ 1.25 = £24.'),
  ('gcse-maths-percentages:pc4','gcse-maths','A car''s value falls from £12,000 to £9,000. What is the percentage decrease?','["25%","33.3%","30%","75%"]',0,'Change £3,000 ÷ original £12,000 × 100 = 25%.'),
  ('gcse-maths-linear-equations:le1','gcse-maths','Solve 4x − 3 = 21.','["x = 4.5","x = 6","x = 7","x = 24"]',1,'Add 3: 4x = 24. Divide by 4: x = 6.'),
  ('gcse-maths-linear-equations:le2','gcse-maths','Solve 6x + 2 = 2x + 18.','["x = 2","x = 4","x = 5","x = 16"]',1,'Subtract 2x: 4x + 2 = 18. Subtract 2: 4x = 16, so x = 4.'),
  ('gcse-maths-linear-equations:le3','gcse-maths','Solve (x + 5) ÷ 3 = 4.','["x = 7","x = 12","x = 17","x = −1"]',0,'Multiply by 3: x + 5 = 12, so x = 7.'),
  ('gcse-englang-language-analysis:la1','gcse-english-language','Which quotation length is usually best for language analysis?','["A whole paragraph","Several sentences","A short word or phrase","No quotation"]',2,'Short quotations let you zoom in on individual word choices.'),
  ('gcse-englang-language-analysis:la2','gcse-english-language','''The classroom was a zoo.'' What technique is this?','["Simile","Metaphor","Onomatopoeia","Alliteration"]',1,'It says the classroom *is* a zoo, rather than *like* one, so it is a metaphor.'),
  ('gcse-englang-language-analysis:la3','gcse-english-language','Which is the strongest comment on effect?','["It uses a verb.","It makes it interesting.","''Clawed'' suggests violent, animal-like force, making the storm feel threatening.","It is descriptive."]',2,'It explains the connotation and links it to the reader''s response.'),
  ('gcse-englit-essay-writing:ee1','gcse-english-literature','What should the opening of a literature essay do?','["Summarise the plot","Give the author''s biography","Answer the question with a clear argument","List every technique"]',2,'A clear thesis tells the examiner your argument from the start.'),
  ('gcse-englit-essay-writing:ee2','gcse-english-literature','Which is the best use of context?','["A paragraph on Victorian history","Linking a writer''s portrayal of poverty to attitudes of the time","Stating the year the text was published","Ignoring it"]',1,'Context should explain the writer''s choices and the text''s ideas.'),
  ('gcse-bio-cells:ce1','gcse-biology','Which structure controls the activities of a eukaryotic cell?','["Cell wall","Nucleus","Cytoplasm","Ribosome"]',1,'The nucleus contains the genetic material that controls cell activities.'),
  ('gcse-bio-cells:ce2','gcse-biology','Which is found in bacterial cells but not in animal cells?','["Ribosomes","Cell membrane","Plasmids","Cytoplasm"]',2,'Plasmids are small rings of DNA found in bacteria.'),
  ('gcse-bio-cells:ce3','gcse-biology','Where does protein synthesis take place?','["Ribosomes","Mitochondria","Vacuole","Cell wall"]',0,'Ribosomes join amino acids to make proteins.'),
  ('gcse-bio-cells:ce4','gcse-biology','An image is 25 mm and the real object is 0.05 mm. Magnification?','["×50","×125","×500","×1250"]',2,'25 ÷ 0.05 = 500.'),
  ('gcse-bio-enzymes:en1','gcse-biology','What happens to an enzyme above its optimum temperature?','["It is killed","It becomes denatured","It works faster forever","It turns into a substrate"]',1,'Bonds break, the active site changes shape and the enzyme is denatured.'),
  ('gcse-bio-enzymes:en2','gcse-biology','Why is each enzyme specific to one substrate?','["Enzymes are large","The active site has a complementary shape","Enzymes are made of fat","Substrates are catalysts"]',1,'Only a substrate that fits the active site''s shape can bind.'),
  ('gcse-chem-atomic-structure:at1','gcse-chemistry','What is the charge of a neutron?','["+1","−1","0","It varies"]',2,'Neutrons have no electric charge.'),
  ('gcse-chem-atomic-structure:at2','gcse-chemistry','An atom has mass number 23 and atomic number 11. How many neutrons?','["11","12","23","34"]',1,'23 − 11 = 12 neutrons.'),
  ('gcse-chem-atomic-structure:at3','gcse-chemistry','What is the electron configuration of oxygen (8 electrons)?','["2,6","8","2,8","4,4"]',0,'The first shell holds 2, leaving 6 in the second shell.'),
  ('gcse-chem-bonding:bo1','gcse-chemistry','What happens to a metal atom in ionic bonding?','["It gains electrons","It loses electrons","It shares electrons","It gains protons"]',1,'Metal atoms lose electrons to form positive ions.'),
  ('gcse-chem-bonding:bo2','gcse-chemistry','Why does diamond have a very high melting point?','["Weak intermolecular forces","Free ions","Many strong covalent bonds must be broken","It is a metal"]',2,'Diamond is a giant covalent structure.'),
  ('gcse-phys-energy:eg1','gcse-physics','What happens to kinetic energy if speed doubles?','["It doubles","It halves","It quadruples","It stays the same"]',2,'Eₖ is proportional to v², and 2² = 4.'),
  ('gcse-phys-energy:eg2','gcse-physics','A kettle has 80% efficiency and uses 1000 J. How much is wasted?','["80 J","200 J","800 J","1080 J"]',1,'Useful = 800 J, so 200 J is dissipated.'),
  ('gcse-phys-energy:eg3','gcse-physics','Which is the unit of energy?','["Watt","Newton","Joule","Pascal"]',2,'Energy is measured in joules (J).'),
  ('gcse-phys-forces:fo1','gcse-physics','What is the unit of force?','["Joule","Watt","Newton","Pascal"]',2,'Force is measured in newtons (N).'),
  ('gcse-phys-forces:fo2','gcse-physics','A 5 kg object has a resultant force of 20 N. Its acceleration is…','["0.25 m/s²","4 m/s²","25 m/s²","100 m/s²"]',1,'a = F ÷ m = 20 ÷ 5 = 4 m/s².'),
  ('gcse-phys-forces:fo3','gcse-physics','A car moves in a straight line at a constant 30 m/s. The resultant force is…','["Forwards","Backwards","Zero","Equal to its weight"]',2,'Constant velocity means no acceleration, so the resultant force is zero.'),
  ('gcse-history-sources:hs1','gcse-history','A government propaganda poster is most useful for studying…','["Exact casualty figures","How the government wanted people to think","Private opinions of soldiers","Weather at the time"]',1,'Propaganda reveals the message and methods the government used.'),
  ('gcse-history-sources:hs2','gcse-history','What does ''provenance'' mean?','["How long a source is","Where a source comes from and why it was made","Whether it is a picture","Its grade value"]',1,'Provenance covers who made the source, when and for what purpose.'),
  ('gcse-geog-tectonics:tc1','gcse-geography','Which margin has earthquakes but no volcanoes?','["Constructive","Destructive","Conservative","All of them"]',2,'At conservative margins plates slide past each other; no magma rises.'),
  ('gcse-geog-tectonics:tc2','gcse-geography','Which is a primary effect of an earthquake?','["Disease spreading","Buildings collapsing","Loss of tourism","Food shortages weeks later"]',1,'Collapse happens immediately as the ground shakes.'),
  ('gcse-cs-binary:bi1','gcse-computer-science','What is 00010101 in denary?','["19","21","25","37"]',1,'16 + 4 + 1 = 21.'),
  ('gcse-cs-binary:bi2','gcse-computer-science','What is 1110 1010 in hexadecimal?','["EA","AE","E10","D9"]',0,'1110 = 14 = E and 1010 = 10 = A.'),
  ('gcse-cs-binary:bi3','gcse-computer-science','How many bits are in a byte?','["4","8","10","16"]',1,'One byte is 8 bits.'),
  ('alevel-maths-differentiation:df1','alevel-maths','Differentiate y = x³.','["3x²","x²","3x","x⁴/4"]',0,'Using the power rule, d(x³)/dx = 3x².'),
  ('alevel-maths-differentiation:df2','alevel-maths','What is the gradient of y = x² + 5x at x = 2?','["9","14","4","10"]',0,'dy/dx = 2x + 5 = 9 at x = 2.'),
  ('alevel-maths-differentiation:df3','alevel-maths','If d²y/dx² > 0 at a stationary point, it is a…','["Maximum","Minimum","Asymptote","Root"]',1,'A positive second derivative means the curve is concave up: a minimum.'),
  ('alevel-bio-cell-division:cd1','alevel-biology','Which process produces two genetically identical daughter cells?','["Meiosis","Mitosis","Fertilisation","Transcription"]',1,'Mitosis produces two genetically identical daughter cells.'),
  ('alevel-bio-cell-division:cd2','alevel-biology','In which stage are sister chromatids pulled to opposite poles?','["Prophase","Metaphase","Anaphase","Telophase"]',2,'Centromeres divide in anaphase and chromatids separate.'),
  ('alevel-chem-equilibria:eq1','alevel-chemistry','What does a catalyst do to the position of equilibrium?','["Moves it right","Moves it left","Does not change it","Stops equilibrium"]',2,'A catalyst speeds up forward and reverse reactions equally.'),
  ('alevel-chem-equilibria:eq2','alevel-chemistry','N₂ + 3H₂ ⇌ 2NH₃. Increasing pressure shifts equilibrium…','["Left","Right","Not at all","It depends on catalyst"]',1,'The right side has 2 gas molecules versus 4 on the left.'),
  ('alevel-chem-equilibria:eq3','alevel-chemistry','Which change alters the value of Kc?','["Adding more reactant","Increasing pressure","Changing temperature","Adding a catalyst"]',2,'Only temperature changes Kc.'),
  ('alevel-psych-research-methods:rm1','alevel-psychology','Which design avoids order effects?','["Repeated measures","Independent groups","Counterbalanced repeated measures","Longitudinal"]',1,'Each participant does only one condition, so there are no order effects.'),
  ('alevel-psych-research-methods:rm2','alevel-psychology','''Participants who sleep 8 hours recall more words than those who sleep 4 hours'' is…','["A null hypothesis","A directional hypothesis","A non-directional hypothesis","An aim"]',1,'It predicts which condition will do better.'),
  ('alevel-econ-supply-demand:sd1','alevel-economics','Coffee becomes more expensive. What happens to demand for tea (a substitute)?','["Shifts right","Shifts left","Movement along","No change"]',0,'People switch to the substitute, so demand for tea increases.'),
  ('alevel-econ-supply-demand:sd2','alevel-economics','An indirect tax on a good will usually…','["Shift supply right","Shift supply left","Shift demand right","Have no effect"]',1,'Taxes raise costs for producers, reducing supply.'),
  ('btec-business-marketing-mix:mk1','btec-business','What does a target market describe?','["All competitors","The intended customer group","A sales forecast","A business objective"]',1,'A target market is the particular group of customers a product aims to reach.'),
  ('btec-business-marketing-mix:mk2','btec-business','Which is part of ''place'' in the marketing mix?','["Discounts","Social media adverts","Where and how the product is sold","Packaging design"]',2,'Place covers distribution channels and where customers can buy.'),
  ('btec-hsc-care-values:cv1','btec-health-social-care','Why is confidentiality important in care?','["It speeds up paperwork","It protects personal information and trust","It removes consent","It replaces safeguarding"]',1,'Confidentiality protects private information and supports trust, while safeguarding duties still apply.'),
  ('btec-hsc-care-values:cv2','btec-health-social-care','Which action best promotes independence?','["Doing tasks for the person to save time","Encouraging the person to do what they can with support","Deciding their routine for them","Limiting their choices"]',1,'Supporting people to do what they can for themselves promotes independence.'),
  ('digital-cyber-threats:cy1','btec-it','What is the purpose of multi-factor authentication?','["Use a longer username","Verify identity using more than one factor","Encrypt every file","Remove passwords"]',1,'MFA asks for two or more different types of evidence to verify a user.'),
  ('digital-cyber-threats:cy2','btec-it','Which threat encrypts files and demands payment?','["Spyware","Ransomware","Adware","A firewall"]',1,'Ransomware locks data until a ransom is paid.'),
  ('tlevel-health-infection-control:ic1','tlevel-health','Which of these is a standard infection control precaution that applies to every patient?','["Hand hygiene","PPE only for patients known to be infectious","Reusing single-use gloves between patients","Skipping hand hygiene if gloves were worn"]',0,'Standard infection control precautions, including hand hygiene, are used for all patients, all the time, whether or not an infection is known.'),
  ('tlevel-health-infection-control:ic2','tlevel-health','Which link is broken by effective hand hygiene?','["Susceptible host","Mode of transmission","Infectious agent''s DNA","None"]',1,'Hand hygiene stops hands transmitting microorganisms.'),
  ('fs-maths-ratio:ra1','functional-skills-maths','Share £45 in the ratio 4:5.','["£20 and £25","£18 and £27","£4 and £5","£22.50 each"]',0,'9 parts; 1 part = £5; £20 and £25.'),
  ('fs-maths-ratio:ra2','functional-skills-maths','Write 18:24 in its simplest form.','["9:12","3:4","6:8","2:3"]',1,'Divide both parts by the highest common factor, 6, to get 3:4.'),
  ('core-maths-estimation:fe1','core-maths','Which is most important in an estimation answer?','["Many decimal places","Clearly stated, sensible assumptions","Using a calculator","Matching the textbook exactly"]',1,'Reasoning and assumptions earn the credit.'),
  ('epq-planning:ep1','epq','Which is the strongest EPQ question?','["Climate change","Everything about AI","To what extent can urban tree planting reduce summer temperatures in UK cities?","Is maths good?"]',2,'It is focused, researchable and allows a reasoned judgement.'),
  ('alevel-physics-suvat:sv1','alevel-physics','A stone is dropped from rest and falls for 2.0 s. Ignoring air resistance, what is its speed? (g = 9.81 m s⁻²)','["19.6 m s⁻¹","9.81 m s⁻¹","39.2 m s⁻¹","4.9 m s⁻¹"]',0,'v = u + at = 0 + 9.81 × 2.0 = 19.6 m s⁻¹.'),
  ('alevel-physics-suvat:sv2','alevel-physics','What does the gradient of a velocity–time graph give?','["Displacement","Acceleration","Speed","Distance travelled"]',1,'Gradient = change in velocity ÷ time, which is acceleration. The area under the graph gives displacement.'),
  ('alevel-physics-suvat:sv3','alevel-physics','A cyclist starts from rest and accelerates uniformly at 1.5 m s⁻² for 4.0 s. How far does she travel?','["6.0 m","24 m","12 m","3.0 m"]',2,'s = ut + ½at² = 0 + ½ × 1.5 × 4.0² = 12 m.'),
  ('alevel-fmaths-complex-numbers:cx1','alevel-further-maths','What is |5 − 12i|?','["7","13","17","169"]',1,'|5 − 12i| = √(5² + 12²) = √169 = 13.'),
  ('alevel-fmaths-complex-numbers:cx2','alevel-further-maths','What is the principal argument of −1 + i?','["π/4","−π/4","3π/4","−3π/4"]',2,'The point (−1, 1) is in the second quadrant, so arg z = π − π/4 = 3π/4.'),
  ('alevel-fmaths-complex-numbers:cx3','alevel-further-maths','Simplify (2 + i)(2 − i).','["3","4 − i","5","4 + 2i"]',2,'(2 + i)(2 − i) = 4 − i² = 4 + 1 = 5, a real number.'),
  ('alevel-englit-unseen-poetry:up1','alevel-english-literature','Which opening is the strongest comparative thesis?','["Poem A is about love and Poem B is also about love.","Both poets explore loss, but one finds comfort in memory while the other resists it.","Poem A uses lots of techniques such as metaphor.","I will first write about Poem A and then Poem B."]',1,'It links both poems and states a similarity and a difference, which gives the essay a clear comparative argument.'),
  ('alevel-englit-unseen-poetry:up2','alevel-english-literature','A sentence runs over a line break without punctuation. What is this called?','["Caesura","Enjambment","Volta","Sibilance"]',1,'Enjambment carries the sense from one line into the next. A caesura is a pause within a line.'),
  ('alevel-englit-unseen-poetry:up3','alevel-english-literature','In AQA 7712 Paper 1 Section B, what are you asked to do?','["Write a comparative essay on two unseen poems","Answer a passage-based question on Shakespeare","Write about a set poetry anthology with the book open","Write an independent critical study"]',0,'Section B is a compulsory essay question on two unseen poems (25 marks).'),
  ('alevel-history-interpretations:hi1','alevel-history','Which of these is the best way to evaluate a historian''s extract?','["Comment on when the book was published","Test its claims against your own contextual knowledge","Count how many facts it includes","Say whether you agree with the historian''s politics"]',1,'AO3 rewards evaluating the argument in relation to the historical context, using your own knowledge.'),
  ('alevel-history-interpretations:hi2','alevel-history','In AQA 7042 Component 1 Section A, how many extracts are you given?','["One","Two","Three","Four"]',2,'Section A provides three extracts linked to a broad issue, and is worth 30 marks.'),
  ('alevel-history-interpretations:hi3','alevel-history','A letter written by a politician in 1911 is best described as…','["An interpretation","A primary source","Historiography","A secondary argument"]',1,'It comes from the period itself, so it is a source (assessed through AO2), not a later interpretation.'),
  ('btec-appsci-cells-microscopy:cm1','btec-applied-science','Which structure is found in prokaryotic cells but not usually in eukaryotic cells?','["Nucleus","Mitochondria","Plasmids","Golgi apparatus"]',2,'Plasmids are small loops of DNA typical of bacteria. Prokaryotes have no nucleus, mitochondria or Golgi apparatus.'),
  ('btec-appsci-cells-microscopy:cm2','btec-applied-science','An image is 12 mm long and the actual object is 40 µm long. What is the magnification?','["×0.3","×30","×300","×3000"]',2,'12 mm = 12 000 µm, and 12 000 ÷ 40 = ×300.'),
  ('btec-appsci-cells-microscopy:cm3','btec-applied-science','Why can an electron microscope show ribosomes when a light microscope cannot?','["It has a higher resolution","It uses living specimens","It uses coloured stains","It has a larger field of view"]',0,'Electrons have a much shorter wavelength than light, so electron microscopes can resolve much smaller structures.'),
  ('btec-sport-skeletal-muscular:sk1','btec-sport','Which fibre type would a marathon runner rely on most?','["Type IIx","Type IIa","Type I","Cardiac muscle"]',2,'Type I fibres are slow twitch and highly resistant to fatigue, ideal for long endurance events.'),
  ('btec-sport-skeletal-muscular:sk2','btec-sport','Holding a plank position mainly involves which type of contraction?','["Concentric","Eccentric","Isometric","Isotonic"]',2,'The muscles produce tension without changing length, which is an isometric contraction.'),
  ('btec-sport-skeletal-muscular:sk3','btec-sport','Pointing the toes, as in a ballet position, is called…','["Dorsiflexion","Plantarflexion","Abduction","Circumduction"]',1,'Plantarflexion points the toes away from the shin; dorsiflexion pulls them towards it.'),
  ('btec-eng-dc-circuits:dc1','btec-engineering','A current of 2 A flows through a 5 Ω resistor. What power does it dissipate?','["10 W","20 W","2.5 W","50 W"]',1,'P = I²R = 2² × 5 = 20 W.'),
  ('btec-eng-dc-circuits:dc2','btec-engineering','A current of 0.5 A flows for 2 minutes. How much charge passes?','["1 C","60 C","0.25 C","240 C"]',1,'Q = It = 0.5 × 120 s = 60 C. Convert minutes to seconds first.'),
  ('btec-eng-dc-circuits:dc3','btec-engineering','What is the total resistance of 20 Ω and 30 Ω in parallel?','["50 Ω","25 Ω","12 Ω","10 Ω"]',2,'1/R = 1/20 + 1/30 = 5/60, so R = 12 Ω.'),
  ('btec-media-representation:mr1','btec-creative-media','A viewer accepts part of an advert''s message but disagrees with the rest. What type of reading is this?','["Preferred","Negotiated","Oppositional","Aberrant"]',1,'A negotiated reading accepts some of the encoded message and rejects or adapts other parts.'),
  ('btec-media-representation:mr2','btec-creative-media','What is anchorage?','["The camera position in a shot","Text that fixes the intended meaning of an image","A recurring character type","The main audience of a product"]',1,'Anchorage, such as a caption or slogan, narrows down how an image is meant to be read.'),
  ('btec-media-representation:mr3','btec-creative-media','A dark, low-key lit alley denotes a street at night. What might it connote?','["A street","Danger or threat","Night-time","A location"]',1,'The other options describe what is literally shown (denotation). Danger is an associated meaning (connotation).'),
  ('tlevel-science-lab-safety:ls1','tlevel-science','Which is an engineering control?','["Safety goggles","A fume cupboard","A standard operating procedure","A warning sign"]',1,'A fume cupboard physically removes fumes at source. Goggles are PPE; SOPs and signs are administrative controls.'),
  ('tlevel-science-lab-safety:ls2','tlevel-science','A pictogram shows a flame over a circle. What does it mean?','["Flammable","Oxidising","Explosive","Corrosive"]',1,'Flame over a circle means oxidising. A flame on its own means flammable.'),
  ('tlevel-science-lab-safety:ls3','tlevel-science','Replacing a concentrated solution with a more dilute one that still works is an example of…','["Elimination","Substitution","PPE","Administrative control"]',1,'Substitution swaps a hazardous substance for a less hazardous one.'),
  ('tlevel-eey-child-development:cd1','tlevel-education-early-years','Which of these is a gross motor skill?','["Using a pincer grasp","Climbing stairs","Threading beads","Turning a page"]',1,'Climbing stairs uses large movements of the whole body. The others are fine motor skills.'),
  ('tlevel-eey-child-development:cd2','tlevel-education-early-years','Two children learn to walk at 11 months and 17 months. What does this show?','["The sequence of development varies","The rate of development varies","The younger walker has a delay","The older walker has a delay"]',1,'Both follow the same sequence, but at different rates. Both ages can be within the typical range.'),
  ('tlevel-eey-child-development:cd3','tlevel-education-early-years','Why should practitioners view development holistically?','["Because areas of development are interconnected","Because only physical development can be observed","Because milestones are fixed","Because each area develops separately"]',0,'Progress in one area supports others, so the whole child should be considered.'),
  ('tlevel-construction-building-regs:br1','tlevel-construction-design','Which Approved Document covers fire safety?','["Part A","Part B","Part L","Part M"]',1,'Part B is fire safety. Part A is structure, Part L is fuel and power, and Part M is access.'),
  ('tlevel-construction-building-regs:br2','tlevel-construction-design','A 10 m² window has a U-value of 1.4 W/m²K. What is the heat loss when ΔT = 15 K?','["14 W","21 W","150 W","210 W"]',3,'Q = U × A × ΔT = 1.4 × 10 × 15 = 210 W.'),
  ('tlevel-construction-building-regs:br3','tlevel-construction-design','Who is the building control authority for higher-risk buildings in England?','["The local planning authority","The Building Safety Regulator","The Health and Safety Executive''s CDM team","The principal contractor"]',1,'The Building Safety Regulator is the building control authority for higher-risk buildings.'),
  ('tlevel-onsite-cdm-2015:cdm1','tlevel-onsite-construction','Which project is notifiable to HSE?','["20 working days with 15 workers at once (300 person days)","35 working days with 25 workers at once","35 working days with 10 workers at once (350 person days)","A one-day job with 5 workers"]',1,'It lasts longer than 30 working days and has more than 20 workers at the same time. None of the other projects meets either test: none exceeds 500 person days, and none combines more than 30 days with more than 20 workers at once.'),
  ('tlevel-onsite-cdm-2015:cdm2','tlevel-onsite-construction','On a project involving more than one contractor, who appoints the principal contractor?','["HSE","The principal designer","The client","The workers"]',2,'The client must appoint the principal designer and principal contractor in writing.'),
  ('tlevel-onsite-cdm-2015:cdm3','tlevel-onsite-construction','What must every worker receive from the principal contractor?','["A site-specific induction","An F10 form","A copy of the design drawings","A CSCS card"]',0,'The principal contractor must make sure all workers have a site-specific induction.'),
  ('tlevel-accounting-double-entry:de1','tlevel-accounting','A business has assets of £50,000 and liabilities of £18,000. What is its capital?','["£68,000","£32,000","£18,000","£50,000"]',1,'Capital = assets − liabilities = £50,000 − £18,000 = £32,000.'),
  ('tlevel-accounting-double-entry:de2','tlevel-accounting','A business sells goods on credit to a customer for £400. What is the double entry?','["Debit Sales; credit Trade receivables","Debit Trade receivables; credit Sales","Debit Bank; credit Sales","Debit Sales; credit Bank"]',1,'The customer now owes the business (an asset, so debit Trade receivables), and income increases (credit Sales).'),
  ('tlevel-accounting-double-entry:de3','tlevel-accounting','A purchase invoice is never entered in the books. What type of error is this?','["Error of commission","Error of principle","Error of omission","Casting error"]',2,'An error of omission leaves out a transaction completely, so the trial balance still agrees.'),
  ('tlevel-legal-civil-courts:cc1','tlevel-legal-services','Where do most civil claims start?','["The Crown Court","The County Court","The Court of Appeal","The Magistrates'' Court"]',1,'The County Court hears most civil claims. The Crown Court deals with criminal cases.'),
  ('tlevel-legal-civil-courts:cc2','tlevel-legal-services','What is the maximum value of a claim on the fast track?','["£10,000","£25,000","£50,000","£100,000"]',1,'The fast track is for claims up to £25,000 with a trial of no more than one day.'),
  ('tlevel-legal-civil-courts:cc3','tlevel-legal-services','Which High Court division would normally hear a dispute about a trust?','["King''s Bench Division","Chancery Division","Family Division","Court of Appeal (Civil Division)"]',1,'The Chancery Division deals with business, property, trusts and insolvency matters.'),
  ('ctech-it-networks:nw1','cambridge-technicals','How many usable host addresses are there on a subnet with mask 255.255.255.192 (/26)?','["64","62","126","30"]',1,'/26 leaves 6 host bits: 2⁶ − 2 = 64 − 2 = 62.'),
  ('ctech-it-networks:nw2','cambridge-technicals','Which network model makes centralised backup and security easiest?','["Peer-to-peer","Client–server","Bus","Ring"]',1,'Client–server networks store data and manage users centrally. Bus and ring are topologies, not network models.'),
  ('ctech-it-networks:nw3','cambridge-technicals','Which topology gives the most resilience because devices have several connections?','["Bus","Star","Ring","Mesh"]',3,'In a mesh, data can take other routes if a link fails, though it costs more to cable.'),
  ('applied-general-break-even:be1','applied-general','Fixed costs are £9,000, price is £20 and variable cost is £8 per unit. What is break-even output?','["450 units","750 units","1,125 units","321 units"]',1,'Contribution = £20 − £8 = £12. Break-even = £9,000 ÷ £12 = 750 units.'),
  ('applied-general-break-even:be2','applied-general','A business breaks even at 750 units and sells 1,000 units. What is its margin of safety?','["250 units","1,750 units","750 units","1,000 units"]',0,'Margin of safety = 1,000 − 750 = 250 units.'),
  ('applied-general-break-even:be3','applied-general','Which is a limitation of break-even analysis?','["It shows the output needed to avoid a loss","It assumes all output is sold at a single price","It helps when setting prices","It can support a loan application"]',1,'In practice businesses offer discounts and costs are not perfectly linear, so the model simplifies reality. The other options are uses.');
-- END STUDY BANK
commit;
