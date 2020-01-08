import BN from 'bn.js'

import ExchangeApiMock from 'api/exchange/ExchangeApiMock'
import Erc20ApiMock from 'api/erc20/Erc20ApiMock'
import { ZERO, ONE, FEE_DENOMINATOR } from 'const'
import * as testHelpers from '../../testHelpers'
import { RECEIPT } from '../../data'
import { ExchangeApi } from 'api/exchange/ExchangeApi'
import { Erc20Api } from 'api/erc20/Erc20Api'

const { USER_1, USER_2, USER_3, FEE_TOKEN, TOKEN_1, TOKEN_2, TOKEN_3, TOKEN_4, BATCH_ID } = testHelpers

jest.mock('api/erc20/Erc20ApiMock')

let instance: ExchangeApi
let mockErc20Api: Erc20Api
const tokens = [FEE_TOKEN, TOKEN_1, TOKEN_2]
const NETWORK_ID = 0

beforeAll(() => {
  testHelpers.mockTimes()
})

beforeEach(() => {
  mockErc20Api = new Erc20ApiMock()
  instance = new ExchangeApiMock({
    balanceStates: {},
    erc20Api: mockErc20Api,
    registeredTokens: tokens,
    ordersByUser: {
      [USER_1]: [
        {
          buyTokenId: 1,
          sellTokenId: 2,
          validFrom: 0,
          validUntil: 6,
          priceNumerator: ONE,
          priceDenominator: ZERO,
          remainingAmount: ONE,
        },
      ],
    },
    maxTokens: 4,
  })
})

describe('Basic view functions', () => {
  test('fee denominator', async () => {
    expect(await instance.getFeeDenominator(NETWORK_ID)).toBe(FEE_DENOMINATOR)
  })

  test('num tokens', async () => {
    expect(await instance.getNumTokens(NETWORK_ID)).toBe(tokens.length)
  })

  describe('get orders', () => {
    it('returns empty when no orders placed by user', async () => {
      expect(await instance.getOrders({ userAddress: USER_2, networkId: NETWORK_ID })).toHaveLength(0)
    })

    it('returns all placed orders', async () => {
      expect(await instance.getOrders({ userAddress: USER_1, networkId: NETWORK_ID })).toHaveLength(1)
    })
  })
})

describe('Token view methods', () => {
  describe('get token id by address', () => {
    it('returns correct id when found', async () => {
      expect(await instance.getTokenIdByAddress({ tokenAddress: tokens[1], networkId: NETWORK_ID })).toBe(1)
    })

    it('throws when id not found', async () => {
      try {
        await instance.getTokenIdByAddress({ tokenAddress: TOKEN_4, networkId: NETWORK_ID })
        fail('Should not reach')
      } catch (e) {
        expect(e.message).toMatch(/^Must have Address to get ID$/)
      }
    })
  })

  describe('get token address by id', () => {
    it('returns correct address when found', async () => {
      expect(await instance.getTokenAddressById({ tokenId: 0, networkId: NETWORK_ID })).toBe(tokens[0])
    })

    it('throws when address not found', async () => {
      try {
        await instance.getTokenAddressById({ tokenId: 10, networkId: NETWORK_ID })
        fail('Should not reach')
      } catch (e) {
        expect(e.message).toMatch(/^Must have ID to get Address$/)
      }
    })
  })
})

describe('addToken', () => {
  it('adds token not registered', async () => {
    const tokenCount = await instance.getNumTokens(NETWORK_ID)

    await instance.addToken({ userAddress: USER_1, tokenAddress: TOKEN_3, networkId: NETWORK_ID })

    expect(await instance.getNumTokens(NETWORK_ID)).toBe(tokenCount + 1)
    expect(await instance.getTokenIdByAddress({ tokenAddress: TOKEN_3, networkId: NETWORK_ID })).toBe(tokenCount)
    expect(await instance.getTokenAddressById({ tokenId: tokenCount, networkId: NETWORK_ID })).toBe(TOKEN_3)
  })

  it('throws when token already registered', async () => {
    try {
      await instance.addToken({ userAddress: USER_1, tokenAddress: tokens[0], networkId: NETWORK_ID })
      fail('Should not reach')
    } catch (e) {
      expect(e.message).toMatch(/^Token already registered$/)
    }
  })
  it('throws when MAX_TOKENS reached', async () => {
    try {
      await instance.addToken({ userAddress: USER_1, tokenAddress: TOKEN_4, networkId: NETWORK_ID })
      fail('Should not reach')
    } catch (e) {
      expect(e.message).toMatch(/^Max tokens reached$/)
    }
  })
})

describe('placeOrder', () => {
  const expected = {
    sellTokenBalance: new BN('1500000000000000000000').add(ONE),
    buyTokenId: 1,
    sellTokenId: 2,
    validFrom: BATCH_ID,
    validUntil: BATCH_ID + 6,
    priceNumerator: ONE,
    priceDenominator: ONE,
    remainingAmount: ONE,
  }

  const params = {
    userAddress: '',
    buyTokenId: expected.buyTokenId,
    sellTokenId: expected.sellTokenId,
    validUntil: expected.validUntil,
    buyAmount: expected.priceNumerator,
    sellAmount: expected.priceDenominator,
    networkId: NETWORK_ID,
  }

  test('place order not first', async () => {
    params.userAddress = USER_1
    const response = await instance.placeOrder(params)
    expect(response).toBe(RECEIPT)
    const actual = (await instance.getOrders({ userAddress: USER_1, networkId: NETWORK_ID })).pop()
    expect(actual).toEqual({ ...expected, user: USER_1, id: '1' })
  })

  test('place first order', async () => {
    expect((await instance.getOrders({ userAddress: USER_3, networkId: NETWORK_ID })).length).toBe(0)
    params.userAddress = USER_2

    const response = await instance.placeOrder(params)
    expect(response).toBe(RECEIPT)
    const actual = (await instance.getOrders({ userAddress: USER_2, networkId: NETWORK_ID })).pop()
    expect(actual).toEqual({ ...expected, user: USER_2, id: '0' })
  })
})
describe('cancelOrder', () => {
  test('cancel existing order', async () => {
    const orderId = (await instance.getOrders({ userAddress: USER_1, networkId: NETWORK_ID })).length - 1

    await instance.cancelOrders({ userAddress: USER_1, orderIds: [orderId], networkId: NETWORK_ID })

    const actual = (await instance.getOrders({ userAddress: USER_1, networkId: NETWORK_ID }))[orderId]
    expect(actual.validUntil).toBe(BATCH_ID - 1)
  })

  test('cancel non existing order does nothing', async () => {
    const expected = await instance.getOrders({ userAddress: USER_1, networkId: NETWORK_ID })

    await instance.cancelOrders({ userAddress: USER_1, orderIds: [expected.length + 1], networkId: NETWORK_ID })

    const actual = await instance.getOrders({ userAddress: USER_1, networkId: NETWORK_ID })
    expect(actual).toEqual(expected)
  })

  test('cancel non existing order, user with no orders does nothing', async () => {
    const expected = await instance.getOrders({ userAddress: USER_2, networkId: NETWORK_ID })

    await instance.cancelOrders({ userAddress: USER_2, orderIds: [expected.length + 1], networkId: NETWORK_ID })

    const actual = await instance.getOrders({ userAddress: USER_2, networkId: NETWORK_ID })
    expect(actual).toEqual(expected)
  })
})
