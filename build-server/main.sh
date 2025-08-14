#!/bin/bash

set -e  # stop on first error
set -x  # print each command as it runs

echo "Cloning repo: $GIT_REPOSITORY__URL"

# fetching GIT_REPOSITORY__URL from .env file or as an environment variable
export GIT_REPOSITORY__URL="$GIT_REPOSITORY__URL"  # export → make the variable available to child processes.

# Clone the project inside /home/app/output folder
git clone "$GIT_REPOSITORY__URL" /home/app/output

# Then execute script.js file
exec node script.js