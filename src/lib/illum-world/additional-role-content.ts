import type { ContractQuestion, RoleContract } from "./role-contracts";

const question = (
  prompt: string,
  options: string[],
  answer: number,
  explanation: string,
): ContractQuestion => ({ prompt, options, answer, explanation });

const reference = (title: string, provider: string, url: string) => ({
  title,
  provider,
  url,
  checked: "2026-11-15",
});

/** Original scenarios and toy datasets. References describe the job or its skills. */
export const ADDITIONAL_ROLE_CONTRACTS: RoleContract[] = [
  {
    id: "quantitative-researcher",
    title: "Quantitative Researcher",
    workplace: "JPMorgan Chase",
    workplaceId: "jpmorgan-chase",
    summary:
      "Forecast demand for the city’s bike hire scheme, compare two rules against later weeks and explain the uncertainty.",
    skills: [
      "Reading time series",
      "Building a baseline",
      "Measuring error",
      "Explaining uncertainty",
    ],
    sources: [
      reference(
        "Quantitative Finance programmes",
        "JPMorgan Chase",
        "https://www.jpmorganchase.com/careers/explore-opportunities/programs/quant-fin-programs",
      ),
    ],
    shifts: [
      {
        id: "forecast-log",
        title: "Shift 1 · Prepare the forecast log",
        minutes: 8,
        brief:
          "The bike hire team needs a rough estimate of next Saturday’s demand. Prepare its fictional booking log in date order.",
        steps: [
          "Confirm that each count covers one Saturday and uses completed hire bookings.",
          "Reserve the two latest weeks for checking your forecast.",
          "Use earlier observations to build a baseline, a simple rule that another model has to beat.",
        ],
        example:
          "Weeks 1–3 recorded 20, 24 and 28 bookings. Their mean is 24. Keep weeks 4 and 5 separate as a test of your rule.",
        questions: [
          question(
            "Which weeks should you use first to build the rule?",
            ["1–3", "4–5", "1 and 5"],
            0,
            "At forecast time, the earlier weeks are available to build the rule. The later weeks represent unseen outcomes.",
          ),
          question(
            "What is the mean of 20, 24 and 28?",
            ["20", "24", "28"],
            1,
            "Add the three counts to get 72, then divide by 3 to get 24.",
          ),
          question(
            "Which detail belongs beside each count?",
            [
              "The researcher’s favourite colour",
              "The result of the model you have yet to use",
              "The Saturday date and the unit 'completed hires'",
            ],
            2,
            "Dates and units make it possible to reproduce the ordering and check whether counts mean the same thing.",
          ),
        ],
      },
      {
        id: "forecast-test",
        title: "Shift 2 · Test two forecast rules",
        minutes: 8,
        brief:
          "The last two weeks recorded 27 and 29 bookings. Compare a constant mean of 24 with a constant last-known count of 28.",
        steps: [
          "Write the predictions beside each observed count.",
          "Find each absolute error by taking the size of the difference between prediction and observation.",
          "Average those two errors to compare the rules on the same weeks.",
        ],
        example:
          "For the 24-booking forecast, the two differences are 3 and 5. The average absolute error is 4 bookings.",
        questions: [
          question(
            "What are the two absolute errors for predictions of 28?",
            ["1 and 1", "1 and 5", "0 and 2"],
            0,
            "28 differs from 27 by one and from 29 by one. Both absolute errors equal one.",
          ),
          question(
            "Which rule scored better on these two weeks?",
            ["The 24-booking rule", "They tied", "The 28-booking rule"],
            2,
            "An average error of one booking is smaller than an average error of four bookings.",
          ),
          question(
            "Why compare both rules on the same weeks?",
            [
              "It gives both rules a perfect score",
              "Each faces the same actual demand",
              "It guarantees a repeat next week",
            ],
            1,
            "Using the same observations keeps changes in demand from favouring either rule in the comparison.",
          ),
        ],
      },
      {
        id: "forecast-note",
        title: "Shift 3 · Write a forecast note",
        minutes: 8,
        brief:
          "The bike hire manager wants something they can use when planning the weekend. Summarise the result and suggest a next check.",
        steps: [
          "Put the forecast and the observed error in bookings.",
          "State how many weeks were used for checking.",
          "List a factor worth tracking and test the rule over a longer period.",
        ],
        example:
          "The 28-booking estimate averaged one booking of error over two Saturdays. Track more Saturdays, including school holidays, before relying on it for staffing.",
        questions: [
          question(
            "Which statement keeps the forecast in context?",
            [
              "Next Saturday will have exactly 28 hires",
              "28 was the better estimate on two test weeks",
              "Every school holiday causes busy Saturdays",
            ],
            1,
            "The result comes from two test weeks. Future demand may follow a different pattern.",
          ),
          question(
            "What would strengthen the evaluation?",
            [
              "Collect more Saturdays, including holidays",
              "Remove the weeks that increase error",
              "Judge the model on predictions alone",
            ],
            0,
            "More observations across different conditions are useful for checking how the rule behaves.",
          ),
          question(
            "Which finding describes error in a usable unit?",
            [
              "The model was good",
              "Performance increased",
              "Mean absolute error was one booking",
            ],
            2,
            "An error with a named measure and unit lets a reader interpret and compare the score.",
          ),
        ],
      },
    ],
  },
  {
    id: "accenture-data-analyst",
    title: "Data Analyst",
    workplace: "Accenture",
    workplaceId: "accenture",
    summary:
      "Help a fictional museum understand where its online booking process is losing visitors.",
    skills: [
      "Comparing rates",
      "Chart design",
      "Defining a measure",
      "Presenting a recommendation",
    ],
    sources: [
      reference(
        "Data visualisation analyst role",
        "Accenture",
        "https://www.accenture.com/us-en/careers/jobdetails?id=R00337012_en",
      ),
      reference(
        "Accenture North America simulations",
        "Forage",
        "https://www.theforage.com/simulations?companies=accenture-nam",
      ),
    ],
    shifts: [
      {
        id: "booking-funnel",
        title: "Shift 1 · Compare booking completion",
        minutes: 8,
        brief:
          "A fictional museum shares a one-day booking dashboard. It recorded 80 starts and 20 completions on phones, and 40 starts and 20 completions on computers.",
        steps: [
          "Check that starts and completions use the same window and device type.",
          "Divide completed bookings by starts to measure completion.",
          "Record the count beside the percent so the team can see how many sessions it represents.",
        ],
        example:
          "For phones, 20 ÷ 80 × 100 = 25% of booking starts completed. Keep the denominator of 80 beside the result.",
        questions: [
          question(
            "What percentage of computer booking starts completed?",
            ["25%", "50%", "100%"],
            1,
            "20 completions divided by 40 starts equals one half, or 50%.",
          ),
          question(
            "Which denominator belongs in the phone rate?",
            ["20 phone completions", "120 total starts", "80 phone starts"],
            2,
            "The phone rate describes the fraction of starts on phones that became completed bookings.",
          ),
          question(
            "Why keep both the number and percentage?",
            [
              "The number gives the percentage scale and context",
              "It makes two device types appear identical",
              "The number proves a cause",
            ],
            0,
            "A percentage shows the proportion and the counts show how much observed activity it describes.",
          ),
        ],
      },
      {
        id: "booking-chart",
        title: "Shift 2 · Make the comparison visible",
        minutes: 8,
        brief:
          "The museum has one slide to make sense of the gap. Prepare a clear chart and a short description of the evidence.",
        steps: [
          "Put phone and computer completion percentages on a shared labelled scale.",
          "Include sample sizes and dates as context.",
          "Express the gap in percentage points by subtracting the two percentages.",
        ],
        example:
          "A two-bar chart starts at 0% and shows Phone 25% (80 starts), Computer 50% (40 starts). The bars differ by 25 percentage points.",
        questions: [
          question(
            "Which chart most directly shows this gap?",
            [
              "Two completion-rate bars on the same scale",
              "A pie chart with two to-scale counts of 20",
              "Two unlabeled trend lines",
            ],
            0,
            "Bar heights on one scale let a viewer compare the two rates immediately.",
          ),
          question(
            "How big is the gap between 25% and 50%?",
            [
              "75 percentage points",
              "25 percentage points",
              "20 percentage points",
            ],
            1,
            "Subtract 25% from 50% to get a gap of 25 percentage points.",
          ),
          question(
            "Which note sets the right scope?",
            [
              "All museum visitors had the same problems",
              "The slide describes a year",
              "The results cover one day of observed online starts",
            ],
            2,
            "The collection window and population tell readers where the comparison applies.",
          ),
        ],
      },
      {
        id: "booking-pilot",
        title: "Shift 3 · Recommend a small test",
        minutes: 8,
        brief:
          "The museum can test one change next week. Draft a recommendation and describe how it will be evaluated.",
        steps: [
          "Suggest watching a few volunteers complete the phone journey with consent.",
          "Pick one friction point to test, such as an unclear date selector.",
          "Compare completion rates before and during a fair pilot and keep record counts.",
        ],
        example:
          "Test a clearer date selector on phones. Compare completed bookings per phone booking start with a matched period and track support requests.",
        questions: [
          question(
            "Which recommendation follows from the evidence?",
            [
              "Remove phone booking immediately",
              "Raise prices for phone users",
              "Investigate why fewer phone starts complete",
            ],
            2,
            "The rate gap shows where to look. A short study can help find the barrier.",
          ),
          question(
            "What is the primary success measure for the test?",
            [
              "Phone completions ÷ phone starts",
              "Every website page view",
              "The colour of the date selector",
            ],
            0,
            "The completion rate measures the outcome the museum is trying to improve.",
          ),
          question(
            "What makes a before-and-after check fairer?",
            [
              "Use different definitions in each period",
              "Compare similar days and keep the counting rules constant",
              "Stop counting incomplete sessions",
            ],
            1,
            "Comparable time periods and consistent definitions reduce differences caused by how you collected the data.",
          ),
        ],
      },
    ],
  },
  {
    id: "aws-solutions-architect",
    title: "Solutions Architect",
    workplace: "Amazon Web Services",
    workplaceId: "aws",
    summary:
      "Design a fictional train information website that stays useful when one part fails or demand suddenly rises.",
    skills: [
      "Identifying requirements",
      "Resilient architecture",
      "Failure testing",
      "Cloud cost awareness",
    ],
    sources: [
      reference(
        "AWS Well-Architected Framework – Reliability",
        "Amazon Web Services",
        "https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html",
      ),
    ],
    shifts: [
      {
        id: "service-map",
        title: "Shift 1 · Map the service",
        minutes: 9,
        brief:
          "A station information site uses one web server. A station closure could send hundreds of commuters to the site at once. Draw the simplest route a request takes.",
        steps: [
          "Identify what riders need first: the latest known departure status.",
          "Trace the request from the phone to the site and its timetable source.",
          "Mark parts whose failure would take the whole site down.",
        ],
        example:
          "Phone → web server → timetable feed. A single server has no stand-in if it fails, and a slow timetable feed can delay every request.",
        questions: [
          question(
            "Which part is the clearest single point of failure?",
            [
              "One web server that handles every request",
              "Several riders' separate phones",
              "The design team’s notes",
            ],
            0,
            "All website requests depend on that one server, so its failure can stop the website for everyone.",
          ),
          question(
            "What is the most useful feature during an outage?",
            [
              "A larger logo",
              "One more animated banner",
              "The last known status labelled with its update time",
            ],
            2,
            "A timestamp lets riders judge how recent the information is when fresh data is temporarily unavailable.",
          ),
          question(
            "Which measurement relates directly to rider experience?",
            [
              "Length of the source file",
              "Time taken to show the status page",
              "Number of meeting invitations",
            ],
            1,
            "The time until a rider sees the page is a direct measure of the service they experience.",
          ),
        ],
      },
      {
        id: "service-design",
        title: "Shift 2 · Design a fallback",
        minutes: 9,
        brief:
          "The transit team can run two server copies in different locations and add a load balancer, a service that distributes requests.",
        steps: [
          "Send requests through the load balancer to either healthy server copy.",
          "Add health checks so the balancer can recognise a failed copy.",
          "Decide when to show a cached copy, and keep its update time visible.",
        ],
        example:
          "If Server A fails a health check, the balancer points new requests to Server B. If the timetable feed is unavailable, the page can show a recent cached status with its timestamp.",
        questions: [
          question(
            "Where should new requests go after A fails its health check?",
            [
              "Stop every request for the day",
              "Keep sending them to A",
              "Send them to healthy Server B",
            ],
            2,
            "Routing to the working copy keeps the service available while the failed one is examined.",
          ),
          question(
            "Which addition can reduce repeated calls to the timetable source?",
            [
              "A shared short-lived cache of timetable responses",
              "Duplicate every call three times",
              "Remove web server health checks",
            ],
            0,
            "A recent cached response can serve repeated equivalent requests and lower pressure on the source.",
          ),
          question(
            "When using the cached status, what should you display?",
            [
              "The age of the status",
              "A random update time",
              "The names of every rider",
            ],
            0,
            "Displaying the true age of fallback data helps readers decide whether they can rely on it.",
          ),
        ],
      },
      {
        id: "service-drill",
        title: "Shift 3 · Run the failure drill",
        minutes: 9,
        brief:
          "The trained team tests the design in a fictional practice environment. Choose what to observe and prepare a one-line handover.",
        steps: [
          "Send a known test load while both copies work.",
          "Disable one copy in the practice environment and count successful requests.",
          "Compare the observed result with the agreed target and record capacity costs.",
        ],
        example:
          "During the drill 96 of 100 requests succeeded. The agreed target was 99 of 100, so the observed result falls short by three requests.",
        questions: [
          question(
            "What fraction of requests succeeded?",
            ["96%", "99%", "4%"],
            0,
            "96 successful requests out of 100 is 96%. Four requests failed.",
          ),
          question(
            "What should the handover say?",
            [
              "The service is ready because a backup exists",
              "96 of 100 during the drill, below our 99 of 100 target",
              "Failures are impossible",
            ],
            1,
            "The handover should include the observed result, the target and the gap so the team can act.",
          ),
          question(
            "What should the team compare before adding more copies?",
            [
              "Only the colour of their diagrams",
              "Only the number of requests on the quietest day",
              "Service improvement and the cost of extra capacity",
            ],
            2,
            "A design should improve reliability enough for its actual traffic and budget.",
          ),
        ],
      },
    ],
  },
  {
    id: "deloitte-data-analyst",
    title: "Data Analyst",
    workplace: "Deloitte",
    workplaceId: "deloitte",
    summary:
      "Investigate inconsistent recycling counts and prepare an evidence report the city can audit.",
    skills: [
      "Reconciling records",
      "Checking denominators",
      "Evidence trails",
      "Challenging a conclusion",
    ],
    sources: [
      reference(
        "Deloitte Australia Data Analytics simulation",
        "Forage",
        "https://www.theforage.com/simulations/deloitte-au/data-analytics-s5zy",
      ),
    ],
    shifts: [
      {
        id: "recycling-audit",
        title: "Shift 1 · Reconcile the records",
        minutes: 8,
        brief:
          "A fictional city recycling pilot counted 50 item scans at Park A. A data export repeated scan ID A-17 with the same time, weight and type.",
        steps: [
          "Save a copy of the export before investigating.",
          "Check whether the data agreement gives one ID to each physical scan.",
          "Write down which row was corrected and the reason an auditor can reproduce.",
        ],
        example:
          "The original included 50 rows. One extra row had exactly the same scan ID and details. After verification, the count is 49 unique scans.",
        questions: [
          question(
            "What makes A-17 a duplicate candidate?",
            [
              "Two bins have the same colour",
              "The scan ID, time, weight and type match",
              "Both items were bottles",
            ],
            1,
            "Identity and matching record fields give concrete evidence that the export repeated a scan.",
          ),
          question(
            "How many unique scans remain after removing the verified duplicate?",
            ["51", "50", "49"],
            2,
            "Subtract one repeated record from the 50 original rows to get 49 unique scans.",
          ),
          question(
            "How should you record the change?",
            [
              "Log the ID, correction and reason beside the preserved export",
              "Discard the copied export and every note",
              "Flag the whole park as incorrect",
            ],
            0,
            "A traceable correction lets another person see exactly what changed and why.",
          ),
        ],
      },
      {
        id: "recycling-rate",
        title: "Shift 2 · Check the rate",
        minutes: 8,
        brief:
          "The city asks how often the scanner found an item in the wrong bin. Park A had 7 flagged out of 49. Park B had 3 flagged out of 21.",
        steps: [
          "Check both scanners used the same rule to flag items.",
          "Divide the count flagged by the count scanned for each park.",
          "Name the unit of comparison: share of scanned items, not share of all waste.",
        ],
        example:
          "7/49 = 1/7, and 3/21 = 1/7. Both observed shares are about 14%, from different numbers of scans.",
        questions: [
          question(
            "Which observed flag rate is higher?",
            ["Park A", "Park B", "The rates are equal"],
            2,
            "Both ratios reduce to 1 out of 7. Park A’s larger count also has a larger denominator.",
          ),
          question(
            "What did the scanners measure?",
            [
              "Flags among recorded scans",
              "All waste produced in both neighbourhoods",
              "The full population of recycling bins",
            ],
            0,
            "The result is limited to the observed items that the pilot scanned.",
          ),
          question(
            "What is needed for a fair comparison?",
            [
              "A larger difference in counts",
              "The same flagging definition",
              "The same park name",
            ],
            1,
            "Consistent definitions ensure that a flag represents the same class of problem in both parks.",
          ),
        ],
      },
      {
        id: "recycling-report",
        title: "Shift 3 · Write the evidence report",
        minutes: 8,
        brief:
          "A draft headline says Park A recycles worse. Prepare a careful sentence for the city analyst.",
        steps: [
          "Include the observed percentages and the sample sizes.",
          "Document the one verified duplicate correction.",
          "Recommend scanning across more days and check if each scanner covers similar hours.",
        ],
        example:
          "The observed wrong-bin flag rate was about 14% in both sample groups. Park A recorded 49 unique scans and Park B recorded 21. Check broader coverage before changing signs.",
        questions: [
          question(
            "Which finding is supported by the scan data?",
            [
              "Park A is always worse",
              "The observed shares were the same",
              "All recyclers used the same bins",
            ],
            1,
            "The calculated rates match in the pilot sample. This evidence cannot establish results outside that sample.",
          ),
          question(
            "What strengthens a follow-up?",
            [
              "Add more different days with matching collection rules",
              "Only rescan the lowest-rate hour",
              "Remove the denominator from the summary",
            ],
            0,
            "Broader observations with consistent rules help test whether the pilot result holds under more conditions.",
          ),
          question(
            "Which detail helps a reviewer reproduce your work?",
            [
              "The report author’s favourite park",
              "The colour of the chart",
              "Which scan ID was duplicated and why it was removed",
            ],
            2,
            "Documenting the correction creates an audit trail from the original file to the report.",
          ),
        ],
      },
    ],
  },
  {
    id: "ai-engineer",
    title: "AI Engineer",
    workplace: "Cognizant",
    workplaceId: "cognizant",
    summary:
      "Prototype an AI tool that sorts fictional library questions, then test errors and plan a safe handoff.",
    skills: [
      "Designing labels",
      "Checking training data",
      "Evaluating errors",
      "Human review and monitoring",
    ],
    sources: [
      reference(
        "AI model training and data services",
        "Cognizant",
        "https://www.cognizant.com/us/en/services/ai/ai-training-data-services",
      ),
      reference(
        "Responsible AI",
        "Cognizant",
        "https://www.cognizant.com/us/en/about-cognizant/responsible-ai",
      ),
    ],
    shifts: [
      {
        id: "library-labels",
        title: "Shift 1 · Plan the labelled examples",
        minutes: 9,
        brief:
          "The city library wants to route demo messages to Renewals, Opening Hours or Staff Review. Define the labels using fictional messages.",
        steps: [
          "Create short examples covering all three paths and a range of writing styles.",
          "Agree a label for unclear or mixed messages before tagging data.",
          "Keep examples for evaluation separate from the training examples.",
        ],
        example:
          "“Can I keep the book to Friday?” goes to Renewals. A message about two unrelated problems or unclear wording goes to Staff Review.",
        questions: [
          question(
            "Which detail belongs in the prepared examples?",
            [
              "A copied list of real library members",
              "The expected routing label for each fictional message",
              "A collection of library passwords",
            ],
            1,
            "A known label shows what the example is meant to teach or what the prediction should match.",
          ),
          question(
            "How should an ambiguous message be handled?",
            [
              "Send it to Staff Review",
              "Delete it so no one sees it",
              "Always classify it as Opening Hours",
            ],
            0,
            "The review route lets a trained person interpret an unclear request before the system takes action.",
          ),
          question(
            "Why hold out some examples?",
            [
              "To remove every difficult example",
              "To avoid measuring the model",
              "To test with messages that the tool did not learn from",
            ],
            2,
            "Held-out examples give a fairer measurement of how the tool handles unfamiliar messages.",
          ),
        ],
      },
      {
        id: "library-evaluation",
        title: "Shift 2 · Check the errors",
        minutes: 9,
        brief:
          "Two demo tools each get 17 of 20 messages right. Tool A sends three unclear messages to the wrong team. Tool B sends three clear messages to staff review.",
        steps: [
          "Look beyond overall accuracy and compare the type of each error.",
          "Ask staff which mistakes create extra work or delay a reader.",
          "Document the evaluation set and choose a safer tool for a supervised pilot.",
        ],
        example:
          "Both tools score 85%, but Tool B hands its three mistakes to staff. That supports a supervised pilot where correct routing matters more than saving staff time.",
        questions: [
          question(
            "What is 17 correct out of 20 as a percent?",
            ["17%", "80%", "85%"],
            2,
            "17 ÷ 20 multiplied by 100 gives 85%.",
          ),
          question(
            "Which tool sends an unclear message to the wrong team in this sample?",
            ["Tool A", "Tool B", "Both tools"],
            0,
            "Tool A made that error three times. Tool B’s three errors were additional staff reviews.",
          ),
          question(
            "Which comparison helps a library pick a pilot?",
            [
              "The tools’ names",
              "The effect and frequency of each kind of error",
              "The number of colours in the interface",
            ],
            1,
            "Teams can choose a safer tool when they understand which mistakes it makes and how often.",
          ),
        ],
      },
      {
        id: "library-pilot",
        title: "Shift 3 · Plan the supervised pilot",
        minutes: 9,
        brief:
          "Summer reading sign-ups introduce message types missing from the original evaluation set. Plan how staff can check and correct decisions.",
        steps: [
          "Include a visible route for staff to take over a wrong suggestion.",
          "Monitor the share of messages sent to review and check new message types.",
          "Test an update on held-out examples before changing live routing.",
        ],
        example:
          "Staff can reroute a request directly. Add fictional summer sign-up examples to the next evaluation and check their errors before wider use.",
        questions: [
          question(
            "What should staff do if the tool makes a wrong suggestion?",
            [
              "Use the review route to correct it",
              "Let the suggestion stand",
              "Remove every related category",
            ],
            0,
            "An authorised human can interpret the message, restore the correct route and flag the issue for analysis.",
          ),
          question(
            "What change could affect pilot performance?",
            [
              "An unchanged label definition",
              "More examples like those in the test",
              "A new message type the evaluation never covered",
            ],
            2,
            "Performance can change as the kind of input changes. New message types deserve targeted evaluation.",
          ),
          question(
            "What belongs in the launch note?",
            [
              "A claim of guaranteed accuracy",
              "What was tested, how to take over, and what to monitor",
              "A promise to stop checking errors",
            ],
            1,
            "The launch note tells staff how to use and supervise the prototype with the evidence available.",
          ),
        ],
      },
    ],
  },
  {
    id: "software-engineer",
    title: "Software Engineer",
    workplace: "GitHub",
    workplaceId: "github",
    summary:
      "Fix a boundary bug in a fictional sports hall booking app and collaborate on a tested change.",
    skills: [
      "Reproducing a bug",
      "Branches and commits",
      "Pull-request review",
      "Release checks",
    ],
    sources: [
      reference(
        "Introduction to GitHub",
        "GitHub Skills",
        "https://github.com/skills/introduction-to-github",
      ),
      reference(
        "Review pull requests",
        "GitHub Skills",
        "https://github.com/skills/review-pull-requests",
      ),
    ],
    shifts: [
      {
        id: "booking-bug",
        title: "Shift 1 · Reproduce the bug",
        minutes: 8,
        brief:
          "A sports hall can hold 12 people. The booking app accepts a 13th reservation because it rejects only when the existing count is greater than 12.",
        steps: [
          "Describe exactly what happens at 11, 12 and 13 existing reservations.",
          "Write the target rule: accept while count is below capacity.",
          "Make the smallest change on a short-lived branch.",
        ],
        example:
          "With 12 places already booked, a new reservation must be rejected. With 11 already booked, one more can be confirmed.",
        questions: [
          question(
            "Which case reveals the reported bug?",
            [
              "An empty hall accepts a booking",
              "At 12 existing bookings, the next attempt is accepted",
              "The hall displays its name",
            ],
            1,
            "Capacity is already reached at 12, so accepting another exposes the boundary error.",
          ),
          question(
            "Which comparison should reject new requests?",
            [
              "Existing count ≥ capacity",
              "Existing count < capacity",
              "Existing count = 0",
            ],
            0,
            "The booking should be rejected when the hall is full or already beyond its stated capacity.",
          ),
          question(
            "What does working on a branch enable?",
            [
              "It removes the need to test",
              "It deploys immediately",
              "It gives room to develop and review a change separately",
            ],
            2,
            "A branch keeps a proposed change available for review before it joins the shared version.",
          ),
        ],
      },
      {
        id: "booking-review",
        title: "Shift 2 · Prepare the review",
        minutes: 8,
        brief:
          "Your branch has a fix. Create a pull request, a proposal to review and merge a change, that explains the bug and its tests.",
        steps: [
          "Describe the earlier behaviour and the new rule.",
          "Add a test at the full-capacity boundary.",
          "Include a test for a request that should still succeed.",
        ],
        example:
          "Summary: reject new reservations when count reaches capacity. Checked: 11 existing accepts the 12th, and 12 existing rejects the next attempt.",
        questions: [
          question(
            "Which test checks that normal booking still works?",
            [
              "12 existing rejects another",
              "13 existing rejects another",
              "11 existing accepts one more",
            ],
            2,
            "This tests the allowed side of the boundary and can catch a change that rejects too early.",
          ),
          question(
            "What helps a reviewer understand the change quickly?",
            [
              "A reproduction and tests in the pull request",
              "A title that only says ‘Changes’",
              "One large unrelated edit",
            ],
            0,
            "A reproducible failure and focused tests explain the change and its effect.",
          ),
          question(
            "What is a useful review comment?",
            [
              "Rewrite the entire app",
              "Please show the test for exactly 12 existing bookings",
              "Merge before testing",
            ],
            1,
            "This comment names the precise missing evidence so the author can address it.",
          ),
        ],
      },
      {
        id: "booking-release",
        title: "Shift 3 · Check before release",
        minutes: 8,
        brief:
          "An automated check found that the label displayed on a full booking needs updating too. Plan how to finish the release.",
        steps: [
          "Read the failure and confirm which expected behaviour it covers.",
          "Update the message and rerun the focused and existing checks.",
          "Share the final result and identify how to undo a faulty release.",
        ],
        example:
          "The app rejects the full booking and displays ‘No spaces left’. Pull-request log: three booking checks passed. Previous release remains available.",
        questions: [
          question(
            "What should the label explain to the player?",
            [
              "The name of the branch",
              "That no spaces are left",
              "A claim their booking succeeded",
            ],
            1,
            "A message should make the result of the player’s request clear at once.",
          ),
          question(
            "What should happen after updating the label?",
            [
              "Rerun the affected checks and the existing suite",
              "Ignore every earlier failure",
              "Disable verification permanently",
            ],
            0,
            "Running the checks again confirms the fix and helps catch regressions elsewhere.",
          ),
          question(
            "What belongs in the release handover?",
            [
              "A list of private passwords",
              "A guarantee every bug is solved",
              "What changed, how it was checked, and how to undo it",
            ],
            2,
            "Those details help the next teammate verify or reverse the release if a problem appears.",
          ),
        ],
      },
    ],
  },
  {
    id: "risk-analyst",
    title: "Risk Analyst",
    workplace: "Goldman Sachs",
    workplaceId: "goldman-sachs",
    summary:
      "Estimate how a supply price change could affect a fictional city event and make a plain-language risk note.",
    skills: [
      "Identifying risk",
      "Scenario calculations",
      "Control design",
      "Reporting exposure",
    ],
    sources: [
      reference(
        "Goldman Sachs Risk simulation",
        "Forage",
        "https://www.theforage.com/simulations/goldman-sachs/risk-ljdz",
      ),
    ],
    shifts: [
      {
        id: "festival-exposure",
        title: "Shift 1 · Identify what could change",
        minutes: 8,
        brief:
          "An in-game festival needs 60 printed event maps. The current price is £2 per copy and the team set a total print budget of £140.",
        steps: [
          "Record the quantity, current quote, and agreed budget.",
          "Name what is uncertain before the team confirms the order.",
          "Calculate the current cost and the budget left over.",
        ],
        example:
          "60 × £2 = £120. The budget has £20 left at today’s price while the quote remains unconfirmed.",
        questions: [
          question(
            "What is an example of a risk to the print budget?",
            [
              "The unit price rises before the quote is confirmed",
              "The event has a published date",
              "The maps have a title",
            ],
            0,
            "An unconfirmed price could change and affect the cost of ordering the required maps.",
          ),
          question(
            "How much of the £140 budget is left at today's price?",
            ["£0", "£20", "£120"],
            1,
            "The estimated cost is £120. Subtract that from £140 to get £20.",
          ),
          question(
            "What belongs in a clear record of this risk?",
            [
              "An anonymous rumour",
              "Only today’s total",
              "The 60-copy quantity, quoted price and budget",
            ],
            2,
            "Documenting the inputs allows someone else to repeat and update the calculation.",
          ),
        ],
      },
      {
        id: "festival-scenarios",
        title: "Shift 2 · Compare two scenarios",
        minutes: 8,
        brief:
          "The team wants to see what happens if the supplier quotes £2.20 or £2.50 per copy for the same 60 maps.",
        steps: [
          "Keep the required volume the same in both scenarios.",
          "Multiply each scenario price by 60 and compare to £140.",
          "Show which scenario passes the budget limit and by how much.",
        ],
        example:
          "The £2.20 scenario costs £132 with £8 left. The £2.50 scenario costs £150, which exceeds the budget by £10.",
        questions: [
          question(
            "Which scenario exceeds the budget?",
            ["The £2.20 price", "The £2.50 price", "Neither price"],
            1,
            "60 copies at £2.50 each cost £150, which exceeds the £140 budget.",
          ),
          question(
            "By how much does the £150 total exceed budget?",
            ["£8", "£20", "£10"],
            2,
            "Subtract £140 from £150 to measure the £10 overrun.",
          ),
          question(
            "What can the scenario tell the team?",
            [
              "How much the budget would change if the condition occurred",
              "The exact price the supplier will quote",
              "The number of visitors at the festival",
            ],
            0,
            "Scenario estimates show consequences under stated conditions. They help a team prepare for possible changes.",
          ),
        ],
      },
      {
        id: "festival-control",
        title: "Shift 3 · Make a practical risk note",
        minutes: 8,
        brief:
          "The event team needs a short note with the issue, possible impact, and what an authorised team member should do.",
        steps: [
          "State the cost that could exceed budget, along with the assumptions.",
          "Suggest a control, an action that helps manage the risk.",
          "Name an owner and a date to check whether the quotes are available.",
        ],
        example:
          "Print costs could reach £150 for 60 copies at £2.50. Ask the event coordinator to confirm a written quote before ordering and review available suppliers on Friday.",
        questions: [
          question(
            "Which action directly controls this risk?",
            [
              "Remove the budget from the notes",
              "Confirm a written price before ordering",
              "Assume the cheapest quote will be available",
            ],
            1,
            "A written quote lets the event coordinator confirm the expected cost before the team commits.",
          ),
          question(
            "What makes the price check actionable?",
            [
              "A named owner and review date",
              "Someone should deal with it one day",
              "An unexplained colour code",
            ],
            0,
            "A named person and a date make the action clear and give the team a point to follow up.",
          ),
          question(
            "What should happen if the approved quote exceeds the budget?",
            [
              "Order extras while waiting",
              "Hide the difference",
              "Flag the overrun for the authorised person to decide",
            ],
            2,
            "A budget owner can choose how to proceed after seeing the size of the risk and the available options.",
          ),
        ],
      },
    ],
  },
  {
    id: "ibm-cybersecurity-analyst",
    title: "Cybersecurity Analyst",
    workplace: "IBM",
    workplaceId: "ibm",
    summary:
      "Investigate unusual activity in a fictional school network and prepare a factual incident timeline.",
    skills: [
      "Reading security logs",
      "Verifying alerts",
      "Incident triage",
      "Writing a timeline",
    ],
    sources: [
      reference(
        "IBM SkillsBuild Cybersecurity Certificate",
        "IBM",
        "https://www.ibm.com/training/badge/ibm-skillsbuild-cybersecurity-certificate",
      ),
    ],
    shifts: [
      {
        id: "lab-timeline",
        title: "Shift 1 · Read the event log",
        minutes: 9,
        brief:
          "The fictional science lab reports a slow demo computer. Its log shows three failed sign-in attempts at 09:02, a successful sign-in at 09:05 and a large data transfer at 09:07.",
        steps: [
          "Check timestamps use the same clock before putting events in order.",
          "Write the device ID and actions as recorded.",
          "Flag which details need checking with the authorised network team.",
        ],
        example:
          "09:02 sign-in failures, 09:05 successful sign-in, 09:07 transfer. This sequence describes the log for device LAB-07. The transfer’s purpose still needs checking.",
        questions: [
          question(
            "Which event occurred immediately before the transfer?",
            [
              "The successful sign-in",
              "A recorded shut-down",
              "The transfer itself",
            ],
            0,
            "The successful sign-in was at 09:05. The transfer followed at 09:07.",
          ),
          question(
            "Which statement is an observation from the log?",
            [
              "The new student stole a file",
              "The log recorded a transfer at 09:07",
              "The network team approved the transfer",
            ],
            1,
            "The time and transfer are recorded. Who caused it and whether it was approved require more evidence.",
          ),
          question(
            "What identifies the source of these events?",
            [
              "A guess about the person using it",
              "The school’s address",
              "The relevant device ID and log source",
            ],
            2,
            "The device ID and log source let the incident team find and verify the records.",
          ),
        ],
      },
      {
        id: "lab-triage",
        title: "Shift 2 · Check the likely impact",
        minutes: 9,
        brief:
          "The school has a scheduled system backup at 09:00 on its backup server. LAB-07 is a different device and its transfer destination is unrecognised.",
        steps: [
          "Compare known backup details with the unusual log entry.",
          "Describe what may be affected and what you still need to establish.",
          "Follow the practice incident process and involve the authorised responder promptly.",
        ],
        example:
          "The known backup used a different device. Escalate the unusual LAB-07 transfer and preserve the event record so the responder can review the destination.",
        questions: [
          question(
            "What fact makes the scheduled backup an incomplete explanation?",
            [
              "Its server and LAB-07 are different devices",
              "The lab has chairs",
              "All backups run forever",
            ],
            0,
            "This transfer came from a different device, so the known backup does not account for this event.",
          ),
          question(
            "Who should decide whether to contain the demo computer?",
            [
              "Any visitor",
              "The authorised incident responder",
              "The first person to read the log",
            ],
            1,
            "The authorised responder can consider the severity and the proper steps for that workplace.",
          ),
          question(
            "What evidence should be kept?",
            [
              "An edited export with inconvenient rows removed",
              "Only a guess about the destination",
              "The original event records and what was checked",
            ],
            2,
            "Original records and notes help the responder check the finding and continue the investigation.",
          ),
        ],
      },
      {
        id: "lab-handover",
        title: "Shift 3 · Hand over the incident",
        minutes: 9,
        brief:
          "The fictional network lead is ready to investigate. Give them the most useful sequence, what is known, and the next owner.",
        steps: [
          "Start with the affected device and the time of the unusual event.",
          "State the comparison to the planned backup and what remains unknown.",
          "Record that the network lead owns the next authorised check.",
        ],
        example:
          "LAB-07 reported an unexpected transfer at 09:07. The planned backup used a different server. Logs are preserved. The network lead will check the destination.",
        questions: [
          question(
            "What should the handover say about the destination?",
            [
              "It was definitely an attacker",
              "It was certainly harmless",
              "It still needs to be verified",
            ],
            2,
            "The provided records leave the destination unverified. State that clearly so the network lead can check it.",
          ),
          question(
            "Who owns the next investigation step?",
            [
              "The fictional network lead",
              "Every person in the school",
              "A random visitor",
            ],
            0,
            "The network lead is the authorised owner named in the handover.",
          ),
          question(
            "Which combination is useful on first read?",
            [
              "An accusation and an unrelated photo",
              "Affected device, event time, checks done and next action",
              "Only the author’s name",
            ],
            1,
            "A compact record of evidence and ownership gives the next person enough to begin.",
          ),
        ],
      },
    ],
  },
  {
    id: "walmart-software-engineer",
    title: "Software Engineer",
    workplace: "Walmart",
    workplaceId: "walmart",
    summary:
      "Repair a fictional order pickup service so a retried request can confirm a reservation only once.",
    skills: [
      "Tracing request flow",
      "Handling retries",
      "Testing inventory changes",
      "Explaining service behaviour",
    ],
    sources: [
      reference(
        "Walmart USA Advanced Software Engineering simulation",
        "Forage",
        "https://www.theforage.com/simulations/walmart/software-engineering-fceb",
      ),
    ],
    shifts: [
      {
        id: "pickup-trace",
        title: "Shift 1 · Trace a duplicate order",
        minutes: 8,
        brief:
          "A simulated shop has four water bottles. The customer taps once, the screen times out, and the app sends the same order request again. Stock falls from four to two.",
        steps: [
          "Follow the request ID from the first attempt to the retry.",
          "Work out which action changed stock and whether the customer asked for one or two.",
          "Record the expected stock after processing one bottle.",
        ],
        example:
          "The retries share request ID PK-51. Reserving one bottle for PK-51 should leave three available. The second update put the system one bottle below that total.",
        questions: [
          question(
            "What shows that the app retried the same request?",
            [
              "Both attempts use PK-51",
              "Both screens have the same colour",
              "Both attempts happen in the same store",
            ],
            0,
            "The request ID identifies the operation across attempts. The same ID with the same details indicates a retry.",
          ),
          question(
            "What stock is expected after one reservation?",
            ["Two", "Three", "Five"],
            1,
            "Four available bottles minus one reservation leaves three.",
          ),
          question(
            "What is the reported fault?",
            [
              "The shop has a stock count",
              "The customer opened the order screen",
              "The retry reserved another bottle for one request",
            ],
            2,
            "The second attempt applied the same inventory change a second time.",
          ),
        ],
      },
      {
        id: "pickup-rule",
        title: "Shift 2 · Handle the retry",
        minutes: 8,
        brief:
          "The service can store the result alongside each unique request ID. Plan a rule for identical retries and for IDs repeated with different order details.",
        steps: [
          "Check whether the ID has already been processed before applying stock changes.",
          "Return the earlier result when the same ID and details recur.",
          "Reject a conflicting reuse of the ID and handle genuinely new orders separately.",
        ],
        example:
          "For PK-51 again with one bottle, show the previous confirmation and keep stock at three. If a second request reuses PK-51 for two bottles, flag the conflict.",
        questions: [
          question(
            "What should identical PK-51 retries return?",
            [
              "A new reservation each time",
              "The existing confirmation",
              "An unrelated receipt",
            ],
            1,
            "Returning the recorded result helps the customer recover the answer while preserving one inventory change.",
          ),
          question(
            "What happens if the same ID arrives with different details?",
            [
              "Flag the conflict and leave the earlier result intact",
              "Accept every conflicting update as new",
              "Delete the original order silently",
            ],
            0,
            "A mismatched ID cannot safely be treated as an identical retry. Preserve the earlier result and flag it.",
          ),
          question(
            "Which request can reserve another bottle when there is stock?",
            [
              "PK-51 again with the same details",
              "The same retry after a long wait",
              "A genuine second order using PK-52",
            ],
            2,
            "A new order has its own request ID and can be checked against available stock.",
          ),
        ],
      },
      {
        id: "pickup-tests",
        title: "Shift 3 · Test deliveries together",
        minutes: 8,
        brief:
          "A network interruption might send copies at almost the same moment. Write tests that catch duplicate changes and keep ordinary orders working.",
        steps: [
          "Send two copies with the same ID and verify that one reservation is recorded.",
          "Send different IDs and verify stock reflects both valid orders.",
          "Test the final bottle and confirm stock stays at or above zero.",
        ],
        example:
          "With one bottle available, two simultaneous copies of PK-51 leave one confirmed reservation and stock zero. A later separate request should receive a sold-out result.",
        questions: [
          question(
            "What should a simultaneous identical-retry test assert?",
            [
              "One reservation and one stock decrease",
              "Two stock decreases",
              "No customer can ever order",
            ],
            0,
            "The test checks that duplicate delivery produces the intended state change exactly once.",
          ),
          question(
            "Why test two different IDs?",
            [
              "To make retries look like new requests",
              "To move the stock checks to another service",
              "To check that valid separate orders still work",
            ],
            2,
            "A fix that ignores duplicates should still let genuine separate orders proceed.",
          ),
          question(
            "What outcome is safe at zero stock?",
            [
              "Confirm another pickup anyway",
              "Return a sold-out result and keep stock at zero",
              "Keep reducing the count",
            ],
            1,
            "A clear sold-out result prevents impossible reservations and makes the inventory state easy to understand.",
          ),
        ],
      },
    ],
  },
  {
    id: "tata-data-analyst",
    title: "Data Analyst",
    workplace: "Tata Group",
    workplaceId: "tata",
    summary:
      "Check a drafted AI summary against fictional street-light repair records and build a trusted brief for the city.",
    skills: [
      "Checking data coverage",
      "Verifying generated claims",
      "Explaining limitations",
      "Writing a decision brief",
    ],
    sources: [
      reference(
        "Tata GenAI Powered Data Analytics simulation",
        "Forage",
        "https://www.theforage.com/simulations/tata/data-analytics-t3zr",
      ),
    ],
    shifts: [
      {
        id: "lighting-coverage",
        title: "Shift 1 · Check what the file covers",
        minutes: 9,
        brief:
          "The city tracks street-light reports in a fictional sample. North logged 50 reports and closed 40. South logged 10 and closed 8. Two other districts did not send data.",
        steps: [
          "Label the reporting window and district coverage.",
          "Check how the dataset defines a closed report.",
          "List which records are missing before calculating a result.",
        ],
        example:
          "The file covers two districts for this week. It includes 60 reports and 48 closed cases. The two missing districts are unknown.",
        questions: [
          question(
            "How many districts provided records?",
            ["Four", "Two", "None"],
            1,
            "The available dataset covers North and South. The other two districts are missing.",
          ),
          question(
            "How many cases were closed in the received records?",
            ["48", "60", "32"],
            0,
            "North closed 40 and South closed 8. Add them for a total of 48.",
          ),
          question(
            "How should the two missing districts be recorded?",
            [
              "Assume they had zero reports",
              "Copy North’s figures into both",
              "Mark them as missing",
            ],
            2,
            "A missing district is outside the available evidence. Its true count needs verification.",
          ),
        ],
      },
      {
        id: "lighting-claims",
        title: "Shift 2 · Verify the draft claims",
        minutes: 9,
        brief:
          "A fictional assistant drafts two claims: '80% of all city reports closed' and 'North handled five times as many reports as South.' Compare them with the file.",
        steps: [
          "Calculate the observed completion proportion from the received records.",
          "Compare the draft claims line by line with the original counts.",
          "Amend any sentence that reaches beyond the districts in the file.",
        ],
        example:
          "48 ÷ 60 gives 80% across the two reporting districts. North recorded 50 reports compared with South’s 10, a fivefold difference in recorded counts.",
        questions: [
          question(
            "Which wording fits the measured rate?",
            [
              "80% of the observed reports across North and South closed",
              "80% closed in every district",
              "80% will close next week",
            ],
            0,
            "The numerator and denominator come from two districts. The result is for their observed reports.",
          ),
          question(
            "Which calculation checks the fivefold difference?",
            ["50 + 10", "50 ÷ 10", "10 ÷ 50"],
            1,
            "Dividing North’s count by South’s yields a factor of five.",
          ),
          question(
            "What should you do with a plausible claim in a generated draft?",
            [
              "Publish every sentence automatically",
              "Check only the first word",
              "Match the claim to the source or revise it",
            ],
            2,
            "A generated sentence can sound plausible while overstating the evidence. Verify the calculation and the scope.",
          ),
        ],
      },
      {
        id: "lighting-brief",
        title: "Shift 3 · Write the checked brief",
        minutes: 9,
        brief:
          "The city team is considering adjusting staffing. Write a concise note with the measured result, a gap and the next check.",
        steps: [
          "Report the overall result for the districts in the file.",
          "Name which records are missing and why they matter.",
          "Recommend checking the missing districts and collecting comparable weeks before changing staffing.",
        ],
        example:
          "North and South closed 48 of 60 recorded reports this week. Two district files are missing. Request the files and compare more weeks before changing staffing.",
        questions: [
          question(
            "What gives the 80% useful context?",
            [
              "A motivational slogan",
              "The data window, districts and 48 out of 60",
              "A single screenshot without figures",
            ],
            1,
            "The time window and sample counts show what was measured and let readers check the result.",
          ),
          question(
            "What should the team do with the missing districts?",
            [
              "Collect and verify their records",
              "Assume both are identical to South",
              "Remove both districts from future work",
            ],
            0,
            "The missing records are needed for a more complete comparison.",
          ),
          question(
            "Which recommendation fits the available sample?",
            [
              "Move the entire team today based on one partial week",
              "Ignore the existing sample completely",
              "Collect more evidence before reallocating staff",
            ],
            2,
            "The partial week is an initial signal. More complete and representative data can support a staffing decision.",
          ),
        ],
      },
    ],
  },
];
