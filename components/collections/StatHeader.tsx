import { useCollections } from '@reservoir0x/reservoir-kit-ui'
import {
  Flex,
  Text,
  Box,
  FormatCryptoCurrency,
  Grid,
} from 'components/primitives'
import { FC, ReactNode } from 'react'
import { formatNumber } from 'utils/numbers'

type Props = {
  label: string
  children: ReactNode
}

const StatBox: FC<Props> = ({ label, children }) => (
  <Box
    css={{
      p: '$4',
      minWidth: 120,
      background: '$gray4',
    }}
  >
    <Text style="subtitle3" css={{ color: '$gray12' }} as="p">
      {label}
    </Text>
    {children}
  </Box>
)

type StatHeaderProps = {
  collection: NonNullable<ReturnType<typeof useCollections>['data']>['0']
}

const StatHeader: FC<StatHeaderProps> = ({ collection }) => {
  const listedPercentage =
    ((collection?.onSaleCount ? +collection.onSaleCount : 0) /
      (collection?.tokenCount ? +collection.tokenCount : 0)) *
    100

  return (
    <Grid
      css={{
        borderRadius: 8,
        overflow: 'hidden',
        gap: 1,
        gridTemplateColumns: '1fr 1fr',
        '@sm': {
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          marginRight: 'auto',
        },
      }}
    >
      <StatBox label="Floor">
        <FormatCryptoCurrency
          amount={collection?.floorAsk?.price?.amount?.decimal}
          address={collection?.floorAsk?.price?.currency?.contract}
          decimals={collection?.floorAsk?.price?.currency?.decimals}
          logoHeight={18}
          textStyle={'h6'}
        />
      </StatBox>

      <StatBox label="Top Offer">
        <FormatCryptoCurrency
          amount={collection?.topBid?.price?.amount?.decimal}
          address={collection?.topBid?.price?.currency?.contract}
          decimals={collection?.topBid?.price?.currency?.decimals}
          logoHeight={18}
          textStyle={'h6'}
        />
      </StatBox>

      <StatBox label="Listed">
        <Text style="h6">{formatNumber(listedPercentage)}%</Text>
      </StatBox>

      <StatBox label="Count">
        <Text style="h6">{formatNumber(collection?.tokenCount)}</Text>
      </StatBox>
    </Grid>
  )
}

export default StatHeader
