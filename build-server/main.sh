#!/bin/bash

# export git repo url, fetching from env files
export GIT_REPOSITORY__URL = "$GIT_REPOSITORY__URL" 

# Clone the project inside /home/app/output folder
git clone "$GIT_REPOSITORY__URL" /home/app/output

# Then execute script.js file
exec node script.js