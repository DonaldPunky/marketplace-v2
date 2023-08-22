import { ListModal, ListStep, useTokens } from '@reservoir0x/reservoir-kit-ui'
import { Button } from 'components/primitives'
import {
  cloneElement,
  useState,
  ComponentProps,
  ComponentPropsWithoutRef,
  FC,
  ReactNode,
  useContext,
} from 'react'
import { CSS } from '@stitches/react'
import { SWRResponse } from 'swr'
import {
  useAccount,
  useNetwork,
  useWalletClient,
  useSwitchNetwork,
} from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { ToastContext } from 'context/ToastContextProvider'
import { useMarketplaceChain } from 'hooks'

type ListingCurrencies = ComponentPropsWithoutRef<
  typeof ListModal
>['currencies']

type Props = {
  token?: ReturnType<typeof useTokens>['data'][0]
  buttonCss?: CSS
  buttonChildren?: ReactNode
  buttonProps?: ComponentProps<typeof Button>
  mutate?: SWRResponse['mutate']
}

const List: FC<Props> = ({
  token,
  buttonCss,
  buttonChildren,
  buttonProps,
  mutate,
}) => {
  const { isDisconnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { addToast } = useContext(ToastContext)
  const [isOpen, setIsOpen] = useState(false)

  const [fee, setFee] = useState(100)

  const marketplaceChain = useMarketplaceChain()
  const { switchNetworkAsync } = useSwitchNetwork({
    chainId: marketplaceChain.id,
  })

  const { data: signer } = useWalletClient()
  const { chain: activeChain } = useNetwork()

  const isInTheWrongNetwork = Boolean(
    signer && marketplaceChain.id !== activeChain?.id
  )

  const listingCurrencies: ListingCurrencies =
    marketplaceChain.listingCurrencies
  const tokenId = token?.token?.tokenId
  const contract = token?.token?.contract

  const trigger = (
    <Button
      css={buttonCss}
      color="primary"
      {...buttonProps}
      onClick={() => {
        setIsOpen(true)
      }}
    >
      {buttonChildren}
    </Button>
  )

  if (isDisconnected || isInTheWrongNetwork) {
    return cloneElement(trigger, {
      onClick: async () => {
        if (switchNetworkAsync && activeChain) {
          const chain = await switchNetworkAsync(marketplaceChain.id)
          if (chain.id !== marketplaceChain.id) {
            return false
          }
        }

        if (!signer) {
          openConnectModal?.()
        }
      },
    })
  } else
    return (
      <ListModal
        trigger={trigger}
        openState={[isOpen, setIsOpen]}
        nativeOnly={true}
        collectionId={contract}
        tokenId={tokenId}
        enableOnChainRoyalties={true}
        currencies={listingCurrencies}
        enableOnChainRoyalties={true}
        onClose={(data, stepData, currentStep) => {
          setIsOpen(false)
          if (mutate && currentStep == ListStep.Complete) mutate()
        }}
        onListingError={(err: any) => {
          if (err?.code === 4001) {
            addToast?.({
              title: 'User canceled transaction',
              description: 'You have canceled the transaction.',
            })
            return
          }
          addToast?.({
            title: 'Could not list token',
            description: 'The transaction was not completed.',
          })
        }}
      />
    )
}

export default List
