import { selectors } from '@royalnavy/design-tokens'
import styled from 'styled-components'

const { color, fontSize } = selectors

export const StyledItemDescription = styled.div`
  color: ${color('neutral', '400')};
  font-size: ${fontSize('base')};
  font-weight: 400;
`
