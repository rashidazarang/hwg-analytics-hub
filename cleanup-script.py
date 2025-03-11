#!/usr/bin/env python3
import re
import sys
import subprocess

def replace_supabase_credentials(content):
    # Replace Supabase URL
    content = re.sub(
        r'(["\'`])https://piyqnldhdxkmuwqajkhz\.supabase\.co\1',
        r'\1REDACTED_SUPABASE_URL\1',
        content
    )
    
    # Replace Supabase anon key (JWT token)
    content = re.sub(
        r'(["\'`])eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\1',
        r'\1REDACTED_SUPABASE_KEY\1',
        content
    )
    
    return content

# Read the modified content from stdin
content = sys.stdin.buffer.read()
try:
    # Try to decode as UTF-8
    content_str = content.decode('utf-8')
    # Apply replacements
    modified_content_str = replace_supabase_credentials(content_str)
    # Convert back to bytes
    sys.stdout.buffer.write(modified_content_str.encode('utf-8'))
except UnicodeDecodeError:
    # If it's not text, just pass it through unchanged
    sys.stdout.buffer.write(content)