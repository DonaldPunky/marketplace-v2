import { FC, useMemo } from 'react'
import { Flex, Text } from '../primitives'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faImage,
  faShoppingCart,
  faSprout,
} from '@fortawesome/free-solid-svg-icons'
import { useChainStats } from 'hooks'
import { formatNumber } from 'utils/numbers'

export const ChainStats = () => {
  const { data: statsData } = useChainStats()
  const stats = statsData?.stats?.['7day']

  const statsSections = useMemo(() => {
    const sections = [
      {
        title: '7d Mints',
        stat: '-',
        icon: faSprout,
      },
      {
        title: '7d Secondary Sales',
        stat: '-',
        icon: faShoppingCart,
      },
      {
        title: '7d New Collections',
        stat: '-',
        icon: faImage,
      },
    ]
    if (stats) {
      sections[0].stat = `${
        stats.mintCount ? formatNumber(stats.mintCount) : 0
      }`
      sections[1].stat = `${
        stats.saleCount ? formatNumber(stats.saleCount) : 0
      }`
      sections[2].stat = `${
        stats.totalCount ? formatNumber(stats.totalCount) : 0
      }`
    }
    return sections
  }, [stats])

  return (
    <Flex css={{ gap: 24 }}>
      {statsSections.map((section, i) => (
        <Flex
          key={i}
          align="center"
          css={{
            border: '1px solid',
            borderColor: '$gray6',
            p: '$4',
            borderRadius: 8,
            gap: '$4',
            flex: 1,
          }}
        >
          <FontAwesomeIcon
            icon={section.icon}
            width={25}
            height={25}
            color="#9BA1A6"
          />
          <Flex direction="column" css={{ gap: '$2' }}>
            <Text style="subtitle2" color="subtle">
              {section.title}
            </Text>
            <Text style="h6">{section.stat}</Text>
          </Flex>
        </Flex>
      ))}
    </Flex>
  )
}
