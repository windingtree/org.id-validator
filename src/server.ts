import 'reflect-metadata';
import express, {Response,Request} from 'express'
import http from "http";
import {decodeJWT, JWTValidator, LoggerFactory} from "@simardwt/winding-tree-utils"
import {Inject, Service} from 'typedi';

const log = LoggerFactory.createLogger(__filename)
const PORT = process.env.APP_PORT||8080;

//if flag is true, we will check of whitelisted ORGiDs (and skip JWT validation against public key!!!!)
//use it only in non PROD
const WHITELIST_ENABLED = process.env.WHITELIST_ENABLED === "true"


interface ORGiDProfile {
    orgID: string;
    comment?: string;
    orgIDSchema?:any
}

const WHITELISTED_ORGIDS: ORGiDProfile[] = [
    {
        orgID: '0x16bec77e1890c9c790b2e1c339a78ad561148e0cae7da9cb50c4c1cd64d77fe6',
        comment: 'EY Leisure (ropsten)',
    },
    {
        orgID: '0xce981ebc76d3b45cac65565046ef11a096ecffdd8d1dd44cd3c47cfdac803ed6',
        comment: 'EY Business (ropsten)',
    },
];

const isOrgIDWhitelisted = (orgID:string):boolean => {
    return getWhitelistedOrgID(orgID) !== undefined;
}


const getWhitelistedOrgID = (orgID:string):ORGiDProfile => {
    return WHITELISTED_ORGIDS.find(o=>o.orgID === orgID);
}



@Service()
export class Server{
    public app: express.Application;

    @Inject()
    jwtValidator: JWTValidator

    constructor() {
        this.app = express();
        this.setup();
    }

    private setup():void {
        log.info('OrgId validator starting up');
        this.app.get('/test', (req,res)=>{
            res.status(200).send({
                status:'OK123'
            })
        })
        this.app.get('/jwt', async (req, res) => {
            let jwt:string = req.query['jwt'] as string;
            let audience:string = req.query['audience'] as string;
            log.debug(`GET /jwt, parameters: jwt=${jwt}, audience=${audience}`);
            if (!jwt || jwt.length === 0) {
                res.status(400).send({
                    error: 'Missing JWT parameter'
                });
            }
            try {
                await this.handleJWT(jwt, audience, req, res);
                log.debug("JWT successfully validated")
            }catch(e){
                log.warn('Cannot validate JWT, got error:',e)
            }
        })

        this.app.get('/orgid', async (req, res) => {
            let orgid:string = req.query['orgid'] as string;
            log.debug(`GET /orgid, parameters: orgid=${orgid}`);
            if (!orgid || orgid.length === 0) {
                res.status(400).send({
                    error: 'Missing orgid parameter'
                });
            }
            try {
                await this.handleORGID(orgid, req, res);
                log.debug("ORGiD successfully retrieved")
            }catch(e){
                log.warn('Cannot retrieve orgID, got error:',e)
            }
        })

    }

    private async handleJWT(jwt: string, audience:string|undefined, req: Request, res: Response): Promise<void> {
        try {
            let decodedJWT = decodeJWT(jwt as string);
            let validationResponse;
            if(WHITELIST_ENABLED && isOrgIDWhitelisted(decodedJWT.issuerDID)){
                //we may have some whitelisted ORGiDs to skip validation (due to Ropsten being sunset)
                //in that case return successful validation and fake orgID schema
                validationResponse={
                    orgIDSchema: getWhitelistedOrgID(decodedJWT.issuerDID).orgIDSchema,
                    status: 'ValidatedOK'
                }
            }else {
                // const orgID = await retrieveORGiDJSON(decodedJWT.audience);
                validationResponse = await this.jwtValidator.validate(jwt as string);
            }
            let comment='';
            //if audience param is present, validate audience too (and only if JWT validation was correct)
            if(validationResponse.status === 'ValidatedOK' && audience && audience.length>0){
                const expectedAudience = audience.toUpperCase().trim()
                const jwtAudience = (decodedJWT && decodedJWT.audience)?decodedJWT.audience.toUpperCase().trim():''
                if(expectedAudience !== jwtAudience){
                    validationResponse.status = "NotValidated";
                }
            }
            res.status(200).send({
                status: validationResponse.status === 'ValidatedOK'?'OK':'NOT_OK',
                payload: validationResponse.status === 'ValidatedOK'?decodedJWT:undefined,
                orgIDSchema: validationResponse.status === 'ValidatedOK'?validationResponse.orgIDSchema:undefined
            })
        } catch (err) {
            log.warn(err);
            res.status(404).send({
                status: 'NOK',
                error:err
            })
        }
    }

    private async handleORGID(orgid: string, req: Request, res: Response): Promise<void> {
        try {
            let orgIDSchema;
            let orgIDWithoutDID = orgid;
            if(orgid.startsWith('did:orgid:')){
                orgIDWithoutDID = orgid.substring(10)
            }
            if(WHITELIST_ENABLED && isOrgIDWhitelisted(orgIDWithoutDID)){
                orgIDSchema = getWhitelistedOrgID(orgIDWithoutDID).orgIDSchema
            }else {
                orgIDSchema = await this.jwtValidator.retrieveOrgIdJSON(orgid);
            }
            res.status(200).send({
                orgIDSchema:orgIDSchema
            })
        } catch (err) {
            log.warn(err);
            res.status(404).send({
                status: 'NOK',
                error:err
            })
        }
    }

    public start():http.Server{
        return this.app.listen(PORT,()=>{
            log.info(`Server listening on port ${PORT}`)
        })
    }
}
