import { clearAllAttributes, removeParam } from 'utils/router'
import { useRouter } from 'next/router'
import { FC, useEffect, useState } from 'react'
import { Button, Flex, Text } from 'components/primitives'

type Attribute = {
  key: string
  value: string
}[]

const SelectedAttributes: FC = () => {
  const router = useRouter()

  const [filters, setFilters] = useState<Attribute>([])

  useEffect(() => {
    let filters = []

    // Extract all queries of attribute type
    // and convert into token format
    Object.keys({ ...router.query }).map((key) => {
      if (
        key.startsWith('attributes[') &&
        key.endsWith(']') &&
        router.query[key] !== ''
      ) {
        if (Array.isArray(router.query[key])) {
          let values = router.query[key] as string[]
          values.forEach((value) => {
            filters.push({ key: key.slice(11, -1), value: value })
          })
        } else {
          filters.push({ key: key.slice(11, -1), value: router.query[key] })
        }
      }
    })

    setFilters(filters)
  }, [router.query])

  if (filters.length === 0) return null

  return (
    <Flex wrap="wrap" align="center">
      {filters.map(({ key, value }) => (
        <Button
          key={key + value}
          onClick={() => removeParam(router, `attributes[${key}]`, value)}
          color="gray4"
          css={{ mr: '$4', mb: '24px' }}
        >
          <Text css={{ color: '$primary11' }}>{key}:</Text>
          <Text style="subtitle1">{value}</Text>
        </Button>
      ))}

      {filters.length > 1 && (
        <Button
          onClick={() => clearAllAttributes(router)}
          color="ghost"
          css={{ color: '$primary11', fontWeight: 500, mb: '24px' }}
        >
          Clear all
        </Button>
      )}
    </Flex>
  )
}

export default SelectedAttributes
