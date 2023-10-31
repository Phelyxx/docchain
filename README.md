# Decentralized Document Management System

This is a decentralized app built on top of Polygon with the use of Hardhat and React with NextJS. The purpose of this app is to enable users to securely upload and manage their documents on blockchain by storing them on IPFS. 

# Local deployment

1. Install the dependencies

```sh
npm install
```

2. Set up your local environment by creating a `.env.local` file and adding the following variables:

```
ENVIRONMENT="local"
NEXT_PUBLIC_ENVIRONMENT="local"
PRIVATE_KEY=your metamask private key
API_KEY_LIGHTHOUSE=your lighthouse api key
```

3. Run the local node

```sh
npx hardhat node
```

3. Deploy to localhost

```sh
npx hardhat run scripts/deploy.js --network localhost
```

4. Start the app

```sh
npm start
```

# Testnet deployment

1. Set up your local environment by creating a `.env.local` file and adding the following variables:

```
ENVIRONMENT="testnet"
NEXT_PUBLIC_ENVIRONMENT="testnet"
PRIVATE_KEY=your metamask private key
API_KEY_LIGHTHOUSE=your lighthouse api key
```

2. Deploy to testnet

```sh
npx hardhat run scripts/deploy.js --network mumbai 
```

3. Start the app

```sh
npm run dev
```
