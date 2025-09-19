@echo off
echo Building project...
call npm run build

echo Cleaning old deployment...
if exist dist-temp rmdir /s /q dist-temp

echo Copying build files...
xcopy dist dist-temp /E /I /Y

echo Switching to gh-pages branch...
git checkout gh-pages 2>nul || git checkout -b gh-pages

echo Removing all files from gh-pages...
del /q *.* 2>nul
for /d %%x in (*) do rmdir /s /q "%%x" 2>nul

echo Copying new files...
xcopy dist-temp\* . /E /Y

echo Adding all files...
git add .

echo Committing changes...
git commit -m "Deploy: %date% %time%"

echo Pushing to GitHub Pages...
git push origin gh-pages --force

echo Switching back to main...
git checkout main

echo Cleaning up...
rmdir /s /q dist-temp

echo Deployment complete!
pause



