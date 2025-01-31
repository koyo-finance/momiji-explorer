import React, { ReactElement } from 'react'

import { ExternalLink } from 'components/analytics/ExternalLink'
import LogoWrapper, { LOGO_MAP } from 'components/common/LogoWrapper'

import { ChainId, ExplorerTarget, getExplorerLink } from '@koyofinance/core-sdk'
import { abbreviateString } from 'utils'

type BlockExplorerLinkType = 'tx' | 'address' | 'contract' | 'token' | 'event'

export interface Props {
  /**
   * type of BlockExplorerLink
   */
  type: BlockExplorerLinkType
  /**
   * address or transaction or other hash
   */
  identifier: string
  /**
   * network number | chain id
   */
  networkId?: number
  /**
   * label to replace textContent generated from identifier
   */
  label?: string | ReactElement | void

  /**
   * Use the URL as a label
   */
  useUrlAsLabel?: boolean
  /**
   * className to pass on to <a/>
   */
  className?: string // to allow subclassing styles with styled-components
  /**
   * to show explorer logo
   */
  showLogo?: boolean
}

function getExplorerUrl(networkId: number, type: BlockExplorerLinkType, identifier: string): string {
  return getExplorerLink(
    networkId as ChainId,
    type === 'tx' || type === 'event'
      ? ExplorerTarget.TRANSACTION
      : type === 'token'
      ? ExplorerTarget.TOKEN
      : ExplorerTarget.ADDRESS,
    identifier,
  )
}

/**
 * Dumb BlockExplorerLink, a pure UI component
 *
 * Does not make any assumptions regarding the network.
 * Expects all data as input. Does not use any hooks internally.
 */
export const BlockExplorerLink: React.FC<Props> = (props: Props) => {
  const { type, identifier, label: labelProp, useUrlAsLabel = false, className, networkId, showLogo = false } = props

  if (!networkId || !identifier) {
    return null
  }

  const url = getExplorerUrl(networkId, type, identifier)
  const label = labelProp || (useUrlAsLabel && url) || abbreviateString(identifier, 6, 4)

  return (
    <ExternalLink href={url} eventLabel={url} target="_blank" rel="noopener noreferrer" className={className}>
      <span>{label}</span>
      {showLogo && <LogoWrapper title="Open it on Etherscan" src={LOGO_MAP.etherscan} />}
    </ExternalLink>
  )
}
