## orgid-validator

Simple webservice that can validate JWT(provided as a query parameter)
It does the following:
- reads issuer ORGiD (from JWT)
- retrieves issuer ORGiD JSON file (from either IPFS or HTTP)
- verifies JWT signature with ORGiD public key retrieved from ORGiD JSON file
- checks JWT expiry date


It does not check if the audience of JWT is what it is expected to be.
This is left for the webservice client.


### Development
- checkout code from github repo
- create `.env` file in the main project folder (check `.env.staging` or `.env.production`)
- create `.npmrc` file in the main project folder with credentials to install dependencies from `@simardwt` npm repository
- run `npm install` to install dependencies
- run `npm run start:dev` to launch webserver on your localhost
- open `http://localhost:4000/?jwt=<JWT TOKEN HERE>`

By default it runs on port 4000.
To change the port, define environment variable `PORT`

### Build locally
`npm run build`

### Build using Docker
`docker build . -t orgid-validator:latest`

Note that the build will need to have `.env` file in the main project folder.
This will be the configuration that docker image will use

### Run locally using Docker
`docker run --init -p 8080:4000  orgid-validator`

## license
