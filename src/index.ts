import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';

const envFilePath=path.join(process.cwd(), `.env`)
dotenv.config({path: envFilePath});

import {Server} from "./server";
import http, {IncomingMessage, ServerResponse} from "http";
import {Container} from 'typedi';

const server = Container.get<Server>(Server)
const httpServer:http.Server = server.start();
httpServer.on('error',err=>{
    console.error(`Error occurred:${err}`)
})
/*
httpServer.on('request',(req: IncomingMessage, res: ServerResponse)  => {
    console.log(`Request received ${req.url}`)
} )*/
