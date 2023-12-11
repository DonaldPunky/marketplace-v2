import Link from 'next/link'
import { Flex, Text } from './primitives'
import { useIsUnsupportedChain } from 'hooks'
import { useTheme } from 'next-themes'

const IS_TESTNET_DEPLOYMENT = !process.env.NEXT_PUBLIC_HOST_URL?.includes(
  'explorer.reservoir.tools'
)

const UnsupportedChainBanner = (): JSX.Element => {
  const { unsupportedChain } = useIsUnsupportedChain()

  const { theme } = useTheme()

  return (
    <>
      {unsupportedChain && (
        <Flex
          css={{
            px: '40px',
            py: '12px',
            alignItems: 'center',
            background: theme === 'dark' ? '$violet6' : '$violet9',
          }}
        >
          <Text
            style="body2"
            css={{
              color: 'White',
            }}
          >
            Your wallet is currently connected to the{' '}
            {IS_TESTNET_DEPLOYMENT ? 'testnet' : 'mainnet'}{' '}
            {unsupportedChain.name}. To trade on a{' '}
            {IS_TESTNET_DEPLOYMENT ? 'testnet' : 'mainnet'} chain, switch to
          </Text>
          &nbsp;
          <Link
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
            href={
              IS_TESTNET_DEPLOYMENT
                ? 'https://testnets.reservoir.tools/'
                : 'https://explorer.reservoir.tools/'
            }
          >
            <Text
              css={{
                color: 'White',
                textDecoration: 'underline',
              }}
              style="body2"
            >
              {IS_TESTNET_DEPLOYMENT
                ? 'testnets.reservoir.tools'
                : 'explorer.reservoir.tools'}
            </Text>
          </Link>
        </Flex>
      )}
    </>
  )
}

export default UnsupportedChainBanner
