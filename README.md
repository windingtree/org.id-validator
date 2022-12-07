## orgid-validator

Simple webservice that can validate JWT (provided as a query parameter)
It does the following:

- reads issuer ORGiD (from JWT)
- retrieves issuer ORGiD JSON file (from either IPFS or HTTP)
- verifies JWT signature with ORGiD public key retrieved from ORGiD JSON file
- checks JWT expiry date

It does not check if the audience of JWT is what it is expected to be.
This is left for the webservice client.

### Development

- checkout code from github repo
- create `.env` file on the basis of the `.env.example` that is in the root of the repository
- run `yarn` to install dependencies
- run `yarn start:dev` to launch webserver on your localhost
- open `http://localhost:3333/?jwt=<JWT TOKEN HERE>`

To set the port you should define environment variable `PORT`, this is mandatory variable.

### Build locally

`yarn build`

### Build using Docker

`docker build . -t orgid-validator:latest`

Note that the build will need to have `.env` file in the root project folder.
This will be the configuration that docker image will use

### Run locally using Docker

`docker run --init -p 8080:3333 orgid-validator`
