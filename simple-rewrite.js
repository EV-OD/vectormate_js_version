#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

// Read the JSON mapping
const jsonData = JSON.parse(fs.readFileSync('git-commits.json', 'utf8'));

// Create a map of old hash to new message
const messageMap = {};
jsonData.commits.forEach(commit => {
    messageMap[commit.hash] = commit.message;
});

console.log('🔄 Rewriting commit messages...');

// Get all commits in reverse order (oldest first)
const commits = execSync('git log --format="%H" --reverse', { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(line => line.length > 0);

console.log(`Found ${commits.length} commits to process`);

// Start from the oldest commit
for (let i = 0; i < commits.length; i++) {
    const fullHash = commits[i];
    const shortHash = fullHash.substring(0, 7);
    
    console.log(`Processing commit ${i + 1}/${commits.length}: ${shortHash}`);
    
    // Check if we have a new message for this commit
    if (messageMap[shortHash]) {
        const newMessage = messageMap[shortHash];
        console.log(`  Updating: ${newMessage}`);
        
        try {
            // Checkout the commit
            execSync(`git checkout ${fullHash}`, { stdio: 'pipe' });
            
            // Amend the commit message
            execSync(`git commit --amend -m "${newMessage.replace(/"/g, '\\"')}"`, { stdio: 'pipe' });
            
            // Update the reference for future commits
            if (i < commits.length - 1) {
                // Cherry-pick remaining commits onto this new commit
                const remainingCommits = commits.slice(i + 1);
                execSync(`git cherry-pick ${remainingCommits.join(' ')}`, { stdio: 'pipe' });
                break; // Exit loop as cherry-pick handles the rest
            }
        } catch (error) {
            console.log(`  ⚠️  Error updating commit: ${error.message}`);
        }
    } else {
        console.log(`  No update needed`);
    }
}

// Go back to master
execSync('git checkout master', { stdio: 'pipe' });

console.log('✅ Complete! Updated commit messages.');
console.log('💡 Check your git log to see the changes.');
