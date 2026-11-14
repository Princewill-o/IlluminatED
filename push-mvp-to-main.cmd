@echo off
setlocal
cd /d "%~dp0"
set LOG=%~dp0.education-export\learning-mvp\push-to-main.log
echo IlluminatED MVP: commit 79 reviewed files to main and push > "%LOG%"
echo. & echo Committing ONLY the reviewed MVP files to main. Other changed files are left alone. & echo.
git fetch origin >> "%LOG%" 2>&1
for /f %%i in ('git rev-parse HEAD') do set HEAD_SHA=%%i
for /f %%i in ('git rev-parse origin/main') do set MAIN_SHA=%%i
git merge-base --is-ancestor origin/main HEAD
if errorlevel 1 (echo STOP: this branch does not contain the latest origin/main. Nothing was committed. & echo STOP: not based on origin/main >> "%LOG%" & goto end)
git reset -q >> "%LOG%" 2>&1
git add -- "src\middleware.ts" "src\app\layout.tsx" "src\app\page.tsx" "src\app\sitemap.ts" "src\lib\app-shell.ts" "src\lib\supabase-browser.ts" "src\app\dashboard\page.tsx" "src\app\english\page.tsx" "src\app\maths\page.tsx" "src\app\onboarding\page.tsx" >> "%LOG%" 2>&1
git add -- "src\app\progress\page.tsx" "src\app\school\actions.ts" "src\app\school\page.tsx" "src\app\schools\page.tsx" "src\app\science\page.tsx" "src\app\sign-in\page.tsx" "src\app\teacher\page.tsx" "src\app\world\page.tsx" "src\components\app\app-shell.tsx" "src\components\app\site-chrome.tsx" >> "%LOG%" 2>&1
git add -- "src\components\blocks\footer.tsx" "src\components\blocks\navbar.tsx" "src\components\illum-world\repair-mission.tsx" "src\components\learning\subject-diagram.tsx" "src\components\learning\subject-page.tsx" "src\components\learning\subject-practice.tsx" "src\components\learning\subject-progress.tsx" "src\components\learning\subjects.module.css" "src\components\learning-school\forms.tsx" "src\components\learning-school\supplemental-resources.tsx" >> "%LOG%" 2>&1
git add -- "src\components\products\learning-chrome.tsx" "src\components\products\product-switcher.tsx" "src\game\core\world.ts" "src\lib\account\actions.ts" "src\lib\account\paths.ts" "src\lib\illum-world\pdf.ts" "src\lib\illum-world\repair.ts" "src\lib\illum-world\server.ts" "src\lib\learning\actions.ts" "src\lib\learning\mission-help.ts" >> "%LOG%" 2>&1
git add -- "src\lib\learning\packs.ts" "src\lib\learning\products.ts" "src\lib\learning\save-queue.ts" "src\lib\learning-school\catalogue.ts" "src\lib\learning-school\resources.ts" "src\lib\social\server.ts" "src\app\auth\callback\route.ts" "src\app\english\[topic]\page.tsx" "src\app\games\world\page.tsx" "src\app\learning-resources\[id]\page.tsx" >> "%LOG%" 2>&1
git add -- "src\app\maths\[topic]\page.tsx" "src\app\school\content\page.tsx" "src\app\science\[topic]\page.tsx" "src\app\world\my-work\page.tsx" "src\app\world\pilot\page.tsx" "src\app\world\tech-repair-trainee\actions.ts" "src\app\world\tech-repair-trainee\page.tsx" "src\app\school\class\[id]\page.tsx" "src\app\world\my-work\[id]\page.tsx" "src\app\world\pilot\sample\route.ts" >> "%LOG%" 2>&1
git add -- "src\app\world\my-work\[id]\download\route.ts" "tests\auth-redirects.test.mjs" "tests\illumworld-repair.test.mjs" "tests\learning-products.test.mjs" "tests\learning-subjects.test.mjs" "tests\illumworld-repair-database.sql" "tests\learning-resources-database.sql" "tests\learning-school-database.sql" "tests\learning-subjects-assignments-database.sql" "tests\learning-subjects-database.sql" >> "%LOG%" 2>&1
git add -- "supabase\migrations\20261114113213_learning_school_products.sql" "supabase\migrations\20261114113252_illumworld_repair_project.sql" "supabase\migrations\20261114120850_learning_subject_attempts.sql" "supabase\migrations\20261114121159_learning_school_private_endpoints.sql" "docs\learning-products-mvp.md" "docs\IlluminatED-Learning-MVP-Handover.md" "docs\handover-assets\certificate-style-reference.webp" "public\landing\certificate-sample.webp" "package.json" >> "%LOG%" 2>&1
git diff --cached --stat >> "%LOG%" 2>&1
git commit -m "IlluminatED Learning MVP: four products, repair mission, navy-and-gold certificate" -m "Product routing, IllumWorld Tech Repair Trainee, nine subject packs, school assignments and review, editorial workflow, landing page update, certificate redesign and review fixes. Database migrations 20261114* are already applied live." >> "%LOG%" 2>&1
if errorlevel 1 (echo STOP: commit failed, see the log. & goto end)
git push origin HEAD:main >> "%LOG%" 2>&1
if errorlevel 1 (echo STOP: push to main was rejected, see the log. Your commit is safe locally. & goto end)
git log -1 --format=PUSHED %%H >> "%LOG%"
echo. & echo Done: pushed to main. You can close this window.
:end
echo Log: %LOG%
pause
