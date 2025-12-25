# Vaad
This is a front-end project with minimal backend API stuff happening. The website is a forum bases website inspired by forum sites like Reddit or 4chan.org.

One good thing about making posts in Vaad is that posters can make use of markdown like style formatting to 

## Notes
The site is currently hosted on github pages. You can visit it [here](https://kartikaykaul.github.io/Vaad/).


The database `db.json` file is located in remote repository [Vaad-backend](https://github.com/KartikayKaul/vaad-backend).


The json-server host url is setup on [render.com](https://render.com). 


The data updates done on render.com are ephemeral. So changes made using PATCH/UPDATE will not be reflected in github repo once we redeploy server. So honestly, if you want you can run `json-server` locally on [`db.json`](https://github.com/KartikayKaul/vaad-backend/blob/main/db.json) file and then reset `SERVER_URI` in the [`constants.js`](https://github.com/KartikayKaul/Vaad/blob/main/scripts/constants.js) to `http://localhost:3000` or you can run the script set-server.sh like so


```shell
./set-server.sh http://localhost:3000
```


And this will change it to the local copy of `db.json`instead of the render app live deployment of the backend server.


If you are running this from the github page link then the constants.js file needs to use the render app deployment for the database or provide a link for the json-server that provides the open ended API to allow querying the db.json endpoints. And you can change to that API URI using `set-server.sh` file.


## Updates
- [202512250434]: 
    - Added some AOS animations. 
    - Fixed some code and in previous commits have added copy post id box on the post content element.This allows user to get the post id to formulate reply in chat using the special text commands. 
    - Text formatting commands have been added as a UI toolbar where a post can be created with.
    - maybe I will add z-index to createPostBox to make it visible throughout and fix it at bottom and add a modal toggle to flip it on or off.
- [202512231419]: Added the delete and undo button logic 