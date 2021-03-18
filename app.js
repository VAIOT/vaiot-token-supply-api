const express = require('express')
const app = express()
const axios = require('axios')
const { BigNumber } = require('@ethersproject/bignumber')

const Web3 = require('web3')

const web3 = new Web3(process.env.infura)

const ierc20 = require('./IERC20.json')

const tokenContract = new web3.eth.Contract(ierc20.abi, process.env.tokenAddress)

async function getTotalSupply() {
    return await tokenContract.methods.totalSupply().call()
}

async function getTotalAndCirculatingSupply() {
    const lockupAddresses = process.env.lockupAddresses.split(' ')
    const totalSupply = await getTotalSupply()
    let lockedSupply = BigNumber.from("0")

    for(const lockupAddress of lockupAddresses) {
        const locked = await tokenContract.methods.balanceOf(lockupAddress).call()
        lockedSupply = lockedSupply.add(BigNumber.from(locked))
    }
    return { totalSupply: totalSupply, circulatingSupply: BigNumber.from(totalSupply).sub(lockedSupply).toString() }
}

async function getVaiPrice() {
    const res = await axios.get(process.env.priceApi)
    return res.data[process.env.tokenAddress].usd
}

app.get('/token', async (req, res) => {
    if (req.query.totalSupply === '') {
        res.send(BigNumber.from(await getTotalSupply()).div(BigNumber.from(10).pow(BigNumber.from(18))).toString())
        return
    }
    if (req.query.circulatingSupply === '') {
        res.send(BigNumber.from((await getTotalAndCirculatingSupply()).circulatingSupply).div(BigNumber.from(10).pow(BigNumber.from(18))).toString())
        return
    }
    const supply = await getTotalAndCirculatingSupply()
    const price = await getVaiPrice()
    res.send({ totalSupply: supply.totalSupply, circulatingSupply: supply.circulatingSupply, usdPrice: price.toString() })
})


app.listen(80, () => {
 console.log("Server running on port 80")
})