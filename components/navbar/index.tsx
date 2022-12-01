import { useRef } from 'react'
import { Box, Flex } from '../primitives'
import GlobalSearch from './GlobalSearch'
import { useRouter } from 'next/router'
import { useShortcutCallback } from 'react-key-shortcuts'
import Link from 'next/link'
import { ConnectWalletButton } from 'components/ConnectWalletButton'
import NavItem from './NavItem'
import ThemeSwitcher from './ThemeSwitcher'
import { useTheme } from 'next-themes'
import HamburgerMenu from './HamburgerMenu'
import { useMediaQuery } from 'react-responsive'
import { useMounted } from '../../hooks'
import MobileSearch from './MobileSearch'

const Navbar = () => {
  const { theme } = useTheme()
  const isMobile = useMediaQuery({ query: '(max-width: 960px)' })
  const isMounted = useMounted()

  let searchRef = useRef<HTMLInputElement>()

  const router = useRouter()
  useShortcutCallback('search', () => {
    if (searchRef?.current) {
      searchRef?.current?.focus()
    }
  })

  if (!isMounted) {
    return null
  }

  return isMobile ? (
    <Flex
      css={{
        py: '$4',
        px: '$4',
        width: '100%',
        borderBottom: '1px solid $gray4',
        zIndex: 999,
        background: '$slate1',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
      }}
      align="center"
      justify="between"
    >
      <Box css={{ flex: 1 }}>
        <Flex align="center">
          <Link href="/">
            <Box css={{ width: 34, cursor: 'pointer' }}>
              <img src="/reservoirLogo.svg" style={{ width: '100%' }} />
            </Box>
          </Link>
        </Flex>
      </Box>
      <Flex align="center" css={{ gap: '$4' }}>
        <MobileSearch />
        <ThemeSwitcher />
        <HamburgerMenu />
      </Flex>
    </Flex>
  ) : (
    <Flex
      css={{
        py: '$4',
        px: '$5',
        width: '100%',
        borderBottom: '1px solid $gray4',
        zIndex: 999,
        background: '$slate1',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
      }}
      align="center"
      justify="between"
    >
      <Box css={{ flex: 1 }}>
        <Flex align="center">
          <Link href="/">
            <Box css={{ width: 112, cursor: 'pointer' }}>
              {theme == 'dark' ? (
                <img src="/reservoirMarketLogo.svg" style={{ width: '100%' }} />
              ) : (
                <img
                  src="/reservoirMarketLogoLight.svg"
                  style={{ width: '100%' }}
                />
              )}
            </Box>
          </Link>
          <Box css={{ flex: 1, px: '$5', maxWidth: '420px' }}>
            <GlobalSearch
              ref={searchRef}
              placeholder="Search collections"
              containerCss={{ width: '100%' }}
            />
          </Box>
          <Flex align="center" css={{ gap: '$5', mr: '$5' }}>
            <Link href="/">
              <NavItem active={router.pathname == '/'}>Explore</NavItem>
            </Link>
            <Link href="/portfolio">
              <NavItem active={router.pathname == '/portfolio'}>Sell</NavItem>
            </Link>
            <Link href="https://docs.reservoir.tools/docs">
              <NavItem active={false}>Docs</NavItem>
            </Link>
          </Flex>
        </Flex>
      </Box>

      <Flex css={{ gap: '$5' }} justify="end" align="center">
        <ThemeSwitcher />
        <Box css={{ maxWidth: '185px' }}>
          <ConnectWalletButton />
        </Box>
      </Flex>
    </Flex>
  )
}

export default Navbar
