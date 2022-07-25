const express = require("express");
const crypto = require('crypto');
const fs = require("fs");
const client = require("https");
const { createCanvas, loadImage } = require("canvas");


const app = express();
const port = process.env.PORT || '3000';

app.get("/", [
    validateRequest,
    createIdentifier,
    downloadBackground,
    downloadLogo,
    // renderText,
    composeImage,
    sendImage,
    cleanupFiles,
]);

// Add the middleware function implementations below this line
function validateRequest(req, res, next) {
    if (!req.query.background){
        return res.status(400).send("missing background");
    }
    if (!req.query.logo){
        return res.status(400).send("missing logo");
    }
    if (!req.query.text){
        return res.status(400).send("missing text");
    }
    next();
}


function createIdentifier(req, res, next) {
    const identifier = crypto.randomUUID();
    req.identifier = identifier;
    next();
}

function downloadBackground(req, res, next) {
    const url = req.query.background;
    const file = fs.createWriteStream(`./${req.identifier}-background.jpg`);

    client.get(url, (webRes) => {
        if (webRes.statusCode < 200 || webRes.statusCode > 299) {
            return res.status(400).send(`Got status code ${webRes.statusCode} while downloading background`);
        }
        webRes.pipe(file).once("close", () => {
            next();
        });
    }).on("error",(err)=>{
        return res.status(500).send("error downloading background");
    });
}

function downloadLogo(req, res, next) {
    const url = req.query.logo;
    const file = fs.createWriteStream(`./${req.identifier}-logo.jpg`);

    client.get(url, (webRes) => {
        if (webRes.statusCode < 200 || webRes.statusCode > 299) {
            return res.status(400).send(`Got status code ${webRes.statusCode} while downloading logo`);
        }
        webRes.pipe(file).once("close", () => {
            next();
        });
    }).on("error",(err)=>{
        return res.status(500).send("error downloading logo");
    });
}


async function composeImage(req, res, next) {

    const background = await loadImage(`./${req.identifier}-background.jpg`);
    const logo = await loadImage(`./${req.identifier}-logo.jpg`);

    const width = background.width;
    const height = background.height;

    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");

    const logoPadding = 20;
    context.drawImage(background, 0, 0, width, height);
    context.drawImage(logo, width - logo.width - logoPadding, height - logo.height - logoPadding);

    const textPadding = 30;
    context.font = "bold 50pt Monospace";
    context.textAlign = "left";

    const textSize = context.measureText(req.query.text);
    context.fillStyle = "rgba(255, 255, 255, 0.8)"
    context.fillRect(0, 0, textSize.width + 2*textPadding, 200);

    context.fillStyle = "#444";
    context.fillText(req.query.text, textPadding, 4*textPadding);


    const buffer = canvas.toBuffer("image/png");
    req.compositeImageBuffer = buffer;
    next();
}


async function sendImage(req, res, next) {
    res.setHeader("Content-Type", "image/png");
    res.send(req.compositeImageBuffer);
    next();
}

async function cleanupFiles(req, res, next) {
    fs.unlink(`./${req.identifier}-background.jpg`, (()=>{}));
    fs.unlink(`./${req.identifier}-logo.jpg`, (()=>{}));
    next();
}


app.listen(port, function () {
    console.log(`Image API listening on port ${port}!`);
});
