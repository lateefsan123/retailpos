# Manual GitHub Pages deployment script
Write-Host "Starting manual GitHub Pages deployment..."

# Build the project
Write-Host "Building project..."
npm run build

# Create a temporary directory for gh-pages
$tempDir = "temp-gh-pages"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}

# Clone the repository to temp directory
Write-Host "Cloning repository..."
git clone https://github.com/lateefsan123/retailpos.git $tempDir

# Navigate to temp directory and create gh-pages branch
Set-Location $tempDir
git checkout --orphan gh-pages
git rm -rf .

# Copy dist contents to temp directory
Write-Host "Copying build files..."
Copy-Item -Path "..\dist\*" -Destination . -Recurse -Force

# Add all files
git add .

# Commit changes
git commit -m "Deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# Push to gh-pages branch (force push to overwrite remote)
Write-Host "Pushing to GitHub Pages..."
git push origin gh-pages --force

# Clean up
Set-Location ..
Remove-Item -Recurse -Force $tempDir

Write-Host "Deployment complete! Your site should be available at:"
Write-Host "https://lateefsan123.github.io/retailpos/"
