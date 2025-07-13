#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔄 Professional Git Commit Message Rewriter');
console.log('===========================================');

// Read JSON file
const jsonData = JSON.parse(fs.readFileSync('git-commits.json', 'utf8'));

// Create the environment variable approach for Windows
const commitMappings = jsonData.commits.map(commit => 
    `if ($env:GIT_COMMIT -like "${commit.hash}*") { echo "${commit.message.replace(/"/g, '`"')}" } else`
).join(' ');

const psScript = `
$originalMessage = [Console]::In.ReadToEnd().Trim()
${commitMappings} { echo $originalMessage }
`;

// Write PowerShell script
fs.writeFileSync('commit-msg-filter.ps1', psScript);

console.log('📝 Created PowerShell message filter script');

try {
    console.log('🔄 Running git filter-branch with PowerShell filter...');
    
    // Use PowerShell for the message filter
    execSync('git filter-branch -f --msg-filter "pwsh -File commit-msg-filter.ps1" -- --all', {
        stdio: 'inherit',
        env: { ...process.env, FILTER_BRANCH_SQUELCH_WARNING: '1' }
    });
    
    console.log('✅ Successfully rewrote commit messages!');
    
} catch (error) {
    console.error('❌ Error:', error.message);
    console.log('💡 Falling back to manual approach...');
    
    // Manual fallback: create a list of git commands to run
    const commands = [];
    jsonData.commits.forEach(commit => {
        commands.push(`# Update commit ${commit.hash}`);
        commands.push(`git filter-branch -f --msg-filter 'echo "${commit.message}"' ${commit.hash}^..${commit.hash}`);
    });
    
    fs.writeFileSync('manual-commit-update.txt', commands.join('\n'));
    console.log('📝 Created manual-commit-update.txt with individual commands');
    console.log('💡 You can run these commands one by one to update each commit');
}

// Cleanup
try {
    fs.unlinkSync('commit-msg-filter.ps1');
    console.log('🧹 Cleaned up temporary files');
} catch (e) {}

console.log('\n🎉 Process complete!');
