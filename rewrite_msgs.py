#!/usr/bin/env python3
import json
import sys
import os

# Load the commit mappings from git-commits.json
def load_commit_mappings():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(script_dir, "git-commits.json")
    
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            # Create mapping from short hash to professional message
            commits = {c["hash"]: c["message"] for c in data["commits"]}
            return commits
    except FileNotFoundError:
        print(f"Error: git-commits.json not found at {json_path}", file=sys.stderr)
        return {}
    except Exception as e:
        print(f"Error loading git-commits.json: {e}", file=sys.stderr)
        return {}

# Global variable to store the mappings
COMMIT_MAPPINGS = load_commit_mappings()

def replace_message(original_message, commit_hash, metadata):
    """
    Replace commit message with professional version from JSON mapping
    
    Args:
        original_message: The original commit message (bytes)
        commit_hash: The full commit hash (bytes)
        metadata: Additional metadata from git-filter-repo
    
    Returns:
        bytes: The new professional commit message
    """
    # Convert bytes to string
    if isinstance(original_message, bytes):
        original_message = original_message.decode('utf-8', errors='replace')
    
    if isinstance(commit_hash, bytes):
        commit_hash_str = commit_hash.decode('utf-8', errors='replace')
    else:
        commit_hash_str = str(commit_hash)
    
    # Get short hash (first 7 characters)
    short_hash = commit_hash_str[:7]
    
    # Look up the professional message
    if short_hash in COMMIT_MAPPINGS:
        new_message = COMMIT_MAPPINGS[short_hash]
        print(f"✅ Transforming {short_hash}: '{original_message.strip()}' → '{new_message}'", file=sys.stderr)
        return new_message.encode('utf-8')
    else:
        # If no mapping found, keep original
        print(f"⚠️  No mapping found for {short_hash}: '{original_message.strip()}'", file=sys.stderr)
        return original_message.encode('utf-8') if isinstance(original_message, str) else original_message

if __name__ == "__main__":
    print(f"🔄 Git commit message rewriter loaded with {len(COMMIT_MAPPINGS)} mappings", file=sys.stderr)
