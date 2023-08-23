import { GetServerSideProps, InferGetServerSidePropsType, NextPage } from 'next'
import { Text, Flex, Box } from '../../../components/primitives'
import {
  useCollections,
  useCollectionActivity,
  useDynamicTokens,
  useAttributes,
} from '@reservoir0x/reservoir-kit-ui'
import { paths } from '@reservoir0x/reservoir-sdk'
import Layout from 'components/Layout'
import { useEffect, useMemo, useRef, useState } from 'react'
import { truncateAddress } from 'utils/truncate'
import CollectionActions from 'components/collections/CollectionActions'
import TokenCard from 'components/collections/TokenCard'
import { AttributeFilters } from 'components/collections/filters/AttributeFilters'
import { FilterButton } from 'components/common/FilterButton'
import SelectedAttributes from 'components/collections/filters/SelectedAttributes'
import { CollectionOffer } from 'components/buttons'
import { Grid } from 'components/primitives/Grid'
import { useIntersectionObserver } from 'usehooks-ts'
import fetcher from 'utils/fetcher'
import { useRouter } from 'next/router'
import { SortTokens } from 'components/collections/SortTokens'
import { useMediaQuery } from 'react-responsive'
import { TabsList, TabsTrigger, TabsContent } from 'components/primitives/Tab'
import * as Tabs from '@radix-ui/react-tabs'
import { NAVBAR_HEIGHT } from 'components/navbar'
import { CollectionActivityTable } from 'components/collections/CollectionActivityTable'
import { ActivityFilters } from 'components/common/ActivityFilters'
import { MobileAttributeFilters } from 'components/collections/filters/MobileAttributeFilters'
import { MobileActivityFilters } from 'components/common/MobileActivityFilters'
import LoadingCard from 'components/common/LoadingCard'
import { useMounted } from 'hooks'
import { NORMALIZE_ROYALTIES } from 'pages/_app'
import {
  faCog,
  faHand,
  faMagnifyingGlass,
  faSeedling,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import supportedChains, { DefaultChain } from 'utils/chains'
import { Head } from 'components/Head'
import { OpenSeaVerified } from 'components/common/OpenSeaVerified'
import { Address, useAccount } from 'wagmi'
import titleCase from 'utils/titleCase'
import Img from 'components/primitives/Img'
import Sweep from 'components/buttons/Sweep'
import Mint from 'components/buttons/Mint'
import ReactMarkdown from 'react-markdown'
import { styled } from '../../../stitches.config'
import optimizeImage from 'utils/optimizeImage'

const StyledImage = styled('img', {})

type ActivityTypes = Exclude<
  NonNullable<
    NonNullable<
      Exclude<Parameters<typeof useCollectionActivity>['0'], boolean>
    >['types']
  >,
  string
>

type Props = InferGetServerSidePropsType<typeof getServerSideProps>

const ItemGrid = styled(Box, {
  width: '100%',
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '$4',
  '@md': {
    gridTemplateColumns: 'repeat(4, 1fr)',
  },
  '@bp1500': {
    gridTemplateColumns: 'repeat(5, 1fr)',
  },
})

const CollectionPage: NextPage<Props> = ({ id, ssr }) => {
  const router = useRouter()
  const { address } = useAccount()
  const [attributeFiltersOpen, setAttributeFiltersOpen] = useState(false)
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [activityFiltersOpen, setActivityFiltersOpen] = useState(true)
  const [activityTypes, setActivityTypes] = useState<ActivityTypes>(['sale'])
  const [initialTokenFallbackData, setInitialTokenFallbackData] = useState(true)
  const isMounted = useMounted()
  const isSmallDevice = useMediaQuery({ maxWidth: 905 }) && isMounted
  const smallSubtitle = useMediaQuery({ maxWidth: 1150 }) && isMounted
  const [playingElement, setPlayingElement] = useState<
    HTMLAudioElement | HTMLVideoElement | null
  >()
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const loadMoreObserver = useIntersectionObserver(loadMoreRef, {})
  const [path, _] = router.asPath.split('?')
  const routerPath = path.split('/')
  const isSweepRoute = routerPath[routerPath.length - 1] === 'sweep'
  const isMintRoute = routerPath[routerPath.length - 1] === 'mint'
  const sweepOpenState = useState(true)
  const mintOpenState = useState(true)

  const scrollRef = useRef<HTMLDivElement | null>(null)

  const scrollToTop = () => {
    let top = (scrollRef.current?.offsetTop || 0) - (NAVBAR_HEIGHT + 16)
    window.scrollTo({ top: top })
  }

  let collectionQuery: Parameters<typeof useCollections>['0'] = {
    id,
    includeTopBid: true,
    includeSalesCount: true,
    includeMintStages: true,
  }

  const { data: collections } = useCollections(collectionQuery, {
    fallbackData: [ssr.collection],
  })

  let collection = collections && collections[0]

  const mintData = collection?.mintStages?.find(
    (stage) => stage.kind === 'public'
  )

  const mintPrice =
    mintData?.price?.amount?.decimal === 0
      ? 'Free'
      : `${
          mintData?.price?.amount?.decimal
        } ${mintData?.price?.currency?.symbol?.toUpperCase()}`

  let tokenQuery: Parameters<typeof useDynamicTokens>['0'] = {
    limit: 20,
    collection: id,
    sortBy: 'floorAskPrice',
    sortDirection: 'asc',
    includeQuantity: true,
    includeLastSale: true,
  }

  const sortDirection = router.query['sortDirection']?.toString()
  const sortBy = router.query['sortBy']?.toString()

  if (sortBy === 'tokenId' || sortBy === 'rarity') tokenQuery.sortBy = sortBy
  if (sortDirection === 'desc') tokenQuery.sortDirection = 'desc'

  // Extract all queries of attribute type
  Object.keys({ ...router.query }).map((key) => {
    if (
      key.startsWith('attributes[') &&
      key.endsWith(']') &&
      router.query[key] !== ''
    ) {
      //@ts-ignore
      tokenQuery[key] = router.query[key]
    }
  })

  const {
    data: tokens,
    mutate,
    fetchNextPage,
    setSize,
    resetCache,
    isFetchingInitialData,
    isFetchingPage,
    hasNextPage,
  } = useDynamicTokens(tokenQuery, {
    fallbackData: initialTokenFallbackData ? [ssr.tokens] : undefined,
  })

  let rareTokenQuery: Parameters<typeof useDynamicTokens>['0'] = {
    limit: 8,
    collection: id,
    includeLastSale: true,
    sortBy: 'rarity',
    sortDirection: 'asc',
  }

  const { data: rareTokens } = useDynamicTokens(rareTokenQuery)

  const attributesData = useAttributes(id)

  const attributes = useMemo(() => {
    if (!attributesData.data) {
      return []
    }
    return attributesData.data
      ?.filter(
        (attribute) => attribute.kind != 'number' && attribute.kind != 'range'
      )
      .sort((a, b) => a.key.localeCompare(b.key))
  }, [attributesData.data])

  if (attributeFiltersOpen && attributesData.response && !attributes.length) {
    setAttributeFiltersOpen(false)
  }

  let creatorRoyalties = collection?.royalties?.bps
    ? collection?.royalties?.bps * 0.01
    : 0
  let chain = titleCase(router.query.chain as string)

  const rarityEnabledCollection = Boolean(
    collection?.tokenCount &&
      +collection.tokenCount >= 2 &&
      attributes &&
      attributes?.length >= 2
  )

  //@ts-ignore: Ignore until we regenerate the types
  const contractKind = collection?.contractKind?.toUpperCase()

  useEffect(() => {
    const isVisible = !!loadMoreObserver?.isIntersecting
    if (isVisible) {
      fetchNextPage()
    }
  }, [loadMoreObserver?.isIntersecting])

  useEffect(() => {
    if (isMounted && initialTokenFallbackData) {
      setInitialTokenFallbackData(false)
    }
  }, [router.query])

  return (
    <Layout>
      <Head
        ogImage={ssr?.collection?.collections?.[0]?.banner}
        title={ssr?.collection?.collections?.[0]?.name}
        description={ssr?.collection?.collections?.[0]?.description as string}
      />
      <Tabs.Root
        defaultValue="items"
        onValueChange={(value) => {
          if (value === 'items') {
            resetCache()
            setSize(1)
            mutate()
          }
        }}
      >
        {collection ? (
          <Flex
            direction="column"
            css={{
              px: '$4',
              pt: '$4',
              pb: 0,
              '@md': {
                px: '$5',
              },

              '@xl': {
                px: '$6',
              },
            }}
          >
            <Flex
              justify="between"
              wrap="wrap"
              css={{ mb: '$4', gap: '$4' }}
              align="start"
            >
              <Flex
                direction="column"
                css={{
                  gap: '$4',
                  minWidth: 0,
                  //flex: 1,
                  width: '100%',
                  '@lg': { width: 'unset' },
                }}
              >
                <Flex css={{ gap: '$4', flex: 1 }} align="center">
                  <Img
                    src={optimizeImage(collection.image!, 250)}
                    width={72}
                    height={72}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 8,
                      objectFit: 'cover',
                    }}
                    alt="Collection Page Image"
                  />
                  <Box css={{ minWidth: 0 }}>
                    <Flex align="center" css={{ gap: '$1', mb: '$1' }}>
                      <Text style="h4" as="h6" ellipsify>
                        {collection.name}
                      </Text>
                      <OpenSeaVerified
                        openseaVerificationStatus={
                          collection?.openseaVerificationStatus
                        }
                      />
                      {mintData && !isSmallDevice ? (
                        <Flex
                          align="center"
                          css={{
                            ml: '$3',
                            borderRadius: 4,
                            px: '$3',
                            py: 7,
                            backgroundColor: '$gray3',
                            gap: '$3',
                          }}
                        >
                          <Flex
                            css={{
                              color: '$green9',
                            }}
                          >
                            <FontAwesomeIcon icon={faSeedling} />
                          </Flex>
                          <Text style="body3">Minting Now</Text>
                        </Flex>
                      ) : null}
                      <Flex
                        align="center"
                        css={{
                          ml: '$3',
                          borderRadius: 4,
                          px: '$3',
                          py: 7,
                          backgroundColor: '$gray3',
                          gap: '$3',
                        }}
                      >
                        <Flex
                          css={{
                            color: '$primary9',
                          }}
                        >
                          <FontAwesomeIcon icon={faCog} />
                        </Flex>
                        <Text style="body3">{contractKind}</Text>
                      </Flex>
                    </Flex>
                    <Text as="p" style="body2" color="subtle" css={{ mt: -4 }}>
                      {truncateAddress(collection?.primaryContract || '')}
                    </Text>
                  </Box>
                </Flex>
              </Flex>
              <Flex align="center">
                <Flex css={{ alignItems: 'center', gap: '$3' }}>
                  <Sweep
                    collectionId={collection.id}
                    openState={isSweepRoute ? sweepOpenState : undefined}
                    buttonChildren={
                      <Flex css={{ gap: '$2' }} align="center" justify="center">
                        <Text style="h6" as="h6" css={{ color: '$bg' }}>
                          Collect
                        </Text>
                        <Text
                          style="h6"
                          as="h6"
                          css={{ color: '$bg', fontWeight: 900 }}
                        >
                          {`${collection.floorAsk?.price?.amount?.native} ETH`}
                        </Text>
                      </Flex>
                    }
                    buttonCss={{ '@lg': { order: 2 } }}
                    mutate={mutate}
                  />
                  {/* Collection Mint */}
                  {mintData ? (
                    <Mint
                      collectionId={collection.id}
                      openState={isMintRoute ? mintOpenState : undefined}
                      buttonChildren={
                        <Flex
                          css={{ gap: '$2', px: '$4' }}
                          align="center"
                          justify="center"
                        >
                          {isSmallDevice && (
                            <FontAwesomeIcon icon={faSeedling} />
                          )}
                          <Text style="h6" as="h6" css={{ color: '$bg' }}>
                            {isSmallDevice ? 'Mint' : 'Mint for'}
                          </Text>

                          {!isSmallDevice && (
                            <Text
                              style="h6"
                              as="h6"
                              css={{ color: '$bg', fontWeight: 900 }}
                            >
                              {`${mintPrice}`}
                            </Text>
                          )}
                        </Flex>
                      }
                      buttonCss={{
                        minWidth: 'max-content',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        flexGrow: 1,
                        justifyContent: 'center',
                        px: '$2',
                        maxWidth: '220px',
                        '@md': {
                          order: 1,
                          px: '$5',
                        },
                      }}
                      mutate={mutate}
                    />
                  ) : null}
                  <CollectionOffer
                    collection={collection}
                    buttonChildren={<FontAwesomeIcon icon={faHand} />}
                    buttonProps={{ color: mintData ? 'gray3' : 'primary' }}
                    buttonCss={{ px: '$4' }}
                    mutate={mutate}
                  />
                </Flex>
              </Flex>
            </Flex>
            {mintData && isSmallDevice ? (
              <Flex
                align="center"
                css={{
                  borderRadius: 4,
                  px: '$3',
                  py: 7,
                  backgroundColor: '$gray3',
                  gap: '$3',
                  mb: '$4',
                  width: 'max-content',
                }}
              >
                <Flex
                  css={{
                    color: '$green9',
                  }}
                >
                  <FontAwesomeIcon icon={faSeedling} />
                </Flex>
                <Text style="body3">Minting Now</Text>
              </Flex>
            ) : null}

            <TabsList css={{ mt: 0 }}>
              <TabsTrigger value="items">Items</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="items">
              <Flex
                css={{
                  gap: attributeFiltersOpen ? '$5' : '',
                  position: 'relative',
                }}
                ref={scrollRef}
              >
                {isSmallDevice ? (
                  <MobileAttributeFilters
                    attributes={attributes}
                    scrollToTop={scrollToTop}
                  />
                ) : (
                  <AttributeFilters
                    attributes={attributes}
                    open={attributeFiltersOpen}
                    setOpen={setAttributeFiltersOpen}
                    scrollToTop={scrollToTop}
                  />
                )}
                <Box
                  css={{
                    flex: 1,
                    width: '100%',
                  }}
                >
                  <Flex justify="between" css={{ marginBottom: '$3' }}>
                    {attributes && attributes.length > 0 && !isSmallDevice && (
                      <FilterButton
                        open={attributeFiltersOpen}
                        setOpen={setAttributeFiltersOpen}
                      />
                    )}
                    <Flex
                      justify={'end'}
                      css={{
                        ml: 'auto',
                        width: '100%',
                        gap: '$2',
                        '@md': {
                          width: 'max-content',
                          gap: '$3',
                        },
                      }}
                    >
                      <SortTokens
                        css={{
                          order: 4,
                          px: '14px',
                          justifyContent: 'center',
                          '@md': {
                            order: 1,
                            width: '220px',
                            minWidth: 'max-content',
                            px: '$5',
                          },
                        }}
                      />
                    </Flex>
                  </Flex>

                  {!isSmallDevice && <SelectedAttributes />}
                  <Flex
                    css={{
                      gap: '$4',
                      mb: '$3',
                      flexWrap: 'wrap',
                      '@bp800': {
                        display: 'flex',
                      },
                      display: 'flex',
                    }}
                  >
                    <Flex css={{ gap: '$1' }}>
                      <Text style="body1" as="p" color="subtle">
                        Floor
                      </Text>
                      <Text style="body1" as="p" css={{ fontWeight: '700' }}>
                        {collection.floorAsk?.price?.amount?.native} ETH
                      </Text>
                    </Flex>
                    <Flex css={{ gap: '$1' }}>
                      <Text style="body1" as="p" color="subtle">
                        Top Bid
                      </Text>
                      <Text style="body1" as="p" css={{ fontWeight: '700' }}>
                        {collection.topBid?.price?.amount?.native || 0} WETH
                      </Text>
                    </Flex>

                    <Flex css={{ gap: '$1' }}>
                      <Text style="body1" as="p" color="subtle">
                        Count
                      </Text>
                      <Text style="body1" as="p" css={{ fontWeight: '700' }}>
                        {Number(collection?.tokenCount)?.toLocaleString()}
                      </Text>
                    </Flex>
                  </Flex>
                  <Grid
                    css={{
                      gap: '$4',
                      pb: '$6',
                      gridTemplateColumns:
                        'repeat(auto-fill, minmax(200px, 1fr))',
                      '@md': {
                        gridTemplateColumns:
                          'repeat(auto-fill, minmax(240px, 1fr))',
                      },
                    }}
                  >
                    {isFetchingInitialData
                      ? Array(10)
                          .fill(null)
                          .map((_, index) => (
                            <LoadingCard key={`loading-card-${index}`} />
                          ))
                      : tokens.map((token, i) => (
                          <TokenCard
                            key={i}
                            token={token}
                            address={address as Address}
                            mutate={mutate}
                            rarityEnabled={rarityEnabledCollection}
                            onMediaPlayed={(e) => {
                              if (
                                playingElement &&
                                playingElement !== e.nativeEvent.target
                              ) {
                                playingElement.pause()
                              }
                              const element =
                                (e.nativeEvent.target as HTMLAudioElement) ||
                                (e.nativeEvent.target as HTMLVideoElement)
                              if (element) {
                                setPlayingElement(element)
                              }
                            }}
                          />
                        ))}
                    <Box
                      ref={loadMoreRef}
                      css={{
                        display: isFetchingPage ? 'none' : 'block',
                      }}
                    >
                      {(hasNextPage || isFetchingPage) &&
                        !isFetchingInitialData && <LoadingCard />}
                    </Box>
                    {(hasNextPage || isFetchingPage) &&
                      !isFetchingInitialData && (
                        <>
                          {Array(6)
                            .fill(null)
                            .map((_, index) => (
                              <LoadingCard key={`loading-card-${index}`} />
                            ))}
                        </>
                      )}
                  </Grid>
                  {tokens.length == 0 && !isFetchingPage && (
                    <Flex
                      direction="column"
                      align="center"
                      css={{ py: '$6', gap: '$4' }}
                    >
                      <Text css={{ color: '$gray11' }}>
                        <FontAwesomeIcon icon={faMagnifyingGlass} size="2xl" />
                      </Text>
                      <Text css={{ color: '$gray11' }}>No items found</Text>
                    </Flex>
                  )}
                </Box>
              </Flex>
            </TabsContent>
            <TabsContent value="details">
              <Flex wrap="wrap">
                <Box css={{ width: '100%', '@lg': { width: 440 }, pb: '$5' }}>
                  <Box
                    css={{
                      borderRadius: 8,
                      overflow: 'hidden',
                      background: '$neutralBgSubtle',
                      $$shadowColor: '$colors$panelShadow',
                      boxShadow: '0 8px 12px 0px $$shadowColor',
                      position: 'relative',
                      '&:hover > a > div > img': {
                        transform: 'scale(1.1)',
                      },
                      '@sm': {
                        '&:hover .token-button-container': {
                          bottom: 0,
                        },
                      },
                    }}
                  >
                    {collection.banner ? (
                      <StyledImage
                        src={optimizeImage(collection.banner, 1000)}
                        css={{
                          borderRadius: 8,
                          borderBottomLeftRadius: 0,
                          borderBottomRightRadius: 0,
                          width: '100%',
                          height: 300,
                          '@md': {
                            height: 350,
                          },
                          '@lg': {
                            height: 200,
                          },
                          objectFit: 'cover',
                        }}
                      />
                    ) : null}
                    <Box css={{ p: '$4' }}>
                      <Text
                        style="h6"
                        as="h6"
                        css={{ mb: '$1', fontWeight: 700 }}
                      >
                        About {collection.name}
                      </Text>
                      <Text
                        style="body1"
                        as="p"
                        css={{
                          lineHeight: 1.5,
                          display: '-webkit-box',
                          WebkitLineClamp: descriptionExpanded ? 'reset' : 4,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        <ReactMarkdown
                          children={collection?.description || ''}
                        />
                      </Text>
                      {(collection?.description?.length || 0) > 140 && (
                        <Text
                          onClick={() =>
                            setDescriptionExpanded(!descriptionExpanded)
                          }
                          style="body1"
                          as="p"
                          css={{
                            cursor: 'pointer',
                            mt: '$2',
                            fontWeight: 600,
                            textDecoration: 'underline',
                          }}
                        >
                          {descriptionExpanded ? 'Close' : 'Expand'}
                        </Text>
                      )}
                      <Box css={{ mt: '$4' }}>
                        <Flex justify="start">
                          <CollectionActions collection={collection} />
                        </Flex>
                      </Box>
                    </Box>
                  </Box>
                  <Box css={{ mt: '$5' }}>
                    <Text
                      css={{ mb: '$2', fontWeight: 700 }}
                      as="h6"
                      style="h6"
                    >
                      Collection Details
                    </Text>
                    {[
                      {
                        label: 'Contract',
                        value: truncateAddress(
                          collection?.primaryContract || ''
                        ),
                      },
                      { label: 'Token Standard', value: contractKind },
                      { label: 'Chain', value: chain },
                      {
                        label: 'Creator Earning',
                        value: creatorRoyalties + '%',
                      },
                      { label: 'Total Supply', value: collection.tokenCount },
                    ].map((data) => (
                      <Flex
                        css={{
                          gap: '$4',
                          justifyContent: 'space-between',
                          mb: '$2',
                        }}
                      >
                        <Text style="body1" color="subtle">
                          {data.label}
                        </Text>
                        <Text style="body1" css={{ fontWeight: 600 }}>
                          {data.value}
                        </Text>
                      </Flex>
                    ))}
                  </Box>
                </Box>
                <Box
                  css={{
                    flex: 1,
                    '@lg': { pl: '$5', ml: '$2', pt: '$2', pb: '$6' },
                  }}
                >
                  <Text style="h7" as="h5" css={{ mb: '$3' }}>
                    Collection Stats
                  </Text>
                  <ItemGrid>
                    {[
                      {
                        name: 'Floor',
                        value:
                          collection.floorAsk?.price?.amount?.native + ' ETH',
                      },
                      {
                        name: 'Top Bid',
                        value:
                          collection.topBid?.price?.amount?.native + ' WETH',
                      },
                      {
                        name: '24h Volume',
                        value: `${collection.volume?.['1day']?.toFixed(2)} ETH`,
                      },

                      {
                        name: '24h Sales',
                        value: `${collection.salesCount?.['1day'] || 0}`,
                      },
                    ].map((stat) => (
                      <Box
                        css={{
                          p: '$4',
                          borderRadius: 8,
                          overflow: 'hidden',
                          background: '$neutralBgSubtle',
                          $$shadowColor: '$colors$panelShadow',
                          boxShadow: '0 0px 12px 0px $$shadowColor',
                          position: 'relative',
                        }}
                      >
                        <Text style="subtitle1" as="p">
                          {stat.name}
                        </Text>
                        <Text style="h5" css={{ fontWeight: 800 }}>
                          {stat.value}
                        </Text>
                      </Box>
                    ))}
                  </ItemGrid>

                  <Text style="h7" as="h5" css={{ mb: '$3', mt: '$5' }}>
                    Rare Tokens
                  </Text>
                  {rareTokens.length > 0 ? (
                    <ItemGrid>
                      {rareTokens.slice(0, 4).map((token) => (
                        <TokenCard
                          showAsk={false}
                          token={token}
                          showSource={false}
                          rarityEnabled={false}
                        />
                      ))}
                    </ItemGrid>
                  ) : (
                    <Text>No rare tokens</Text>
                  )}

                  <Text style="h7" as="h5" css={{ mb: '$3', mt: '$5' }}>
                    Floor Tokens
                  </Text>

                  {rareTokens.length > 0 ? (
                    <ItemGrid>
                      {tokens.slice(0, 4).map((token) => (
                        <TokenCard
                          showAsk={false}
                          token={token}
                          showSource={false}
                          rarityEnabled={false}
                        />
                      ))}
                    </ItemGrid>
                  ) : (
                    <Text>No Tokens</Text>
                  )}
                </Box>
              </Flex>
            </TabsContent>
            <TabsContent value="activity">
              <Flex
                css={{
                  gap: activityFiltersOpen ? '$5' : '',
                  position: 'relative',
                }}
              >
                {isSmallDevice ? (
                  <MobileActivityFilters
                    activityTypes={activityTypes}
                    setActivityTypes={setActivityTypes}
                  />
                ) : (
                  <ActivityFilters
                    open={activityFiltersOpen}
                    setOpen={setActivityFiltersOpen}
                    activityTypes={activityTypes}
                    setActivityTypes={setActivityTypes}
                  />
                )}
                <Box
                  css={{
                    flex: 1,
                    gap: '$4',
                    pb: '$5',
                  }}
                >
                  {!isSmallDevice && (
                    <FilterButton
                      open={activityFiltersOpen}
                      setOpen={setActivityFiltersOpen}
                    />
                  )}
                  <CollectionActivityTable
                    id={id}
                    activityTypes={activityTypes}
                  />
                </Box>
              </Flex>
            </TabsContent>
          </Flex>
        ) : (
          <Box />
        )}
      </Tabs.Root>
    </Layout>
  )
}

export const getServerSideProps: GetServerSideProps<{
  ssr: {
    collection?: paths['/collections/v5']['get']['responses']['200']['schema']
    tokens?: paths['/tokens/v6']['get']['responses']['200']['schema']
    hasAttributes: boolean
  }
  id: string | undefined
}> = async ({ params, res }) => {
  const id = params?.contract?.toString()
  const { reservoirBaseUrl, apiKey, routePrefix } =
    supportedChains.find((chain) => params?.chain === chain.routePrefix) ||
    DefaultChain
  const headers: RequestInit = {
    headers: {
      'x-api-key': apiKey || '',
    },
  }

  let collectionQuery: paths['/collections/v5']['get']['parameters']['query'] =
    {
      id,
      includeTopBid: true,
      includeSalesCount: true,
      normalizeRoyalties: NORMALIZE_ROYALTIES,
    }

  const collectionsPromise = fetcher(
    `${reservoirBaseUrl}/collections/v5`,
    collectionQuery,
    headers
  )

  let tokensQuery: paths['/tokens/v6']['get']['parameters']['query'] = {
    collection: id,
    sortBy: 'floorAskPrice',
    sortDirection: 'asc',
    limit: 20,
    normalizeRoyalties: NORMALIZE_ROYALTIES,
    includeDynamicPricing: true,
    includeAttributes: true,
    includeQuantity: true,
    includeLastSale: true,
  }

  const tokensPromise = fetcher(
    `${reservoirBaseUrl}/tokens/v6`,
    tokensQuery,
    headers
  )

  const promises = await Promise.allSettled([
    collectionsPromise,
    tokensPromise,
  ]).catch(() => {})
  const collection: Props['ssr']['collection'] =
    promises?.[0].status === 'fulfilled' && promises[0].value.data
      ? (promises[0].value.data as Props['ssr']['collection'])
      : {}
  const tokens: Props['ssr']['tokens'] =
    promises?.[1].status === 'fulfilled' && promises[1].value.data
      ? (promises[1].value.data as Props['ssr']['tokens'])
      : {}

  const hasAttributes =
    tokens?.tokens?.some(
      (token) => (token?.token?.attributes?.length || 0) > 0
    ) || false

  res.setHeader(
    'Cache-Control',
    'public, s-maxage=30, stale-while-revalidate=60'
  )

  return {
    props: { ssr: { collection, tokens, hasAttributes }, id },
  }
}

export default CollectionPage
