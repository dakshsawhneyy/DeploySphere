FROM ubuntu:focal

RUN apt-get update
RUN apt-get install curl -y

# Installing node js
RUN curl -sL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get upgrade -y
RUN apt-get install -y nodejs

# Installing Git
RUN apt-get install git -y

# create this location inside container
WORKDIR /home/app

# copy file inside /home/app/
COPY main.sh main.sh
COPY script.js script.js
COPY package*.json ./

# Install all dependencies
RUN npm install

# Make both scripts executable
RUN chmod +x main.sh
RUN chmod +x script.js

# This will execute this script automatically
ENTRYPOINT [ "/home/app/main.sh" ]