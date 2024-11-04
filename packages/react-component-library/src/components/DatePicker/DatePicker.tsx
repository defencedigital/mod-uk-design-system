import { DayPickerProps } from 'react-day-picker'
import { enGB } from 'date-fns/locale'
import FocusTrap from 'focus-trap-react'
import { format } from 'date-fns'
import { IconEvent } from '@royalnavy/icon-library'
import { Placement } from '@popperjs/core'
import React, { useCallback, useRef, useState } from 'react'

import {
  CALENDAR_TABLE_VIEW,
  DATE_VALIDITY,
  type CalendarTableView,
} from './constants'
import { BUTTON_VARIANT } from '../Button'
import { CalendarNavigation } from './CalendarNavigation'
import { CalendarTable } from './CalendarTable'
import { COMPONENT_SIZE } from '../Forms'
import { DATE_FORMAT } from '../../constants'
import { DATEPICKER_ACTION } from './types'
import { hasClass, type ValueOf } from '../../helpers'
import { InlineButton } from '../InlineButtons/InlineButton'
import { isDateValid, isDateDisabled, replaceInvalidDate } from './utils'
import { StyledDatePickerInput } from './partials/StyledDatePickerInput'
import { StyledDayPicker } from './partials/StyledDayPicker'
import { StyledFloatingBox } from './partials/StyledFloatingBox'
import { StyledInlineButtons } from '../InlineButtons/partials/StyledInlineButtons'
import { StyledInput } from '../TextInput/partials/StyledInput'
import { StyledInputWrapper } from './partials/StyledInputWrapper'
import { StyledJumpToToday } from './partials/StyledJumpToToday'
import { StyledLabel } from '../TextInput/partials/StyledLabel'
import { StyledNMYContainer } from './partials/StyledCalendarNavigation'
import { StyledOuterWrapper } from './partials/StyledOuterWrapper'
import { type ComponentWithClass } from '../../common/ComponentWithClass'
import { type InputValidationProps } from '../../common/InputValidationProps'
import { useDatePickerReducer } from './useDatePickerReducer'
import { useExternalId } from '../../hooks/useExternalId'
import { useFocus } from '../../hooks/useFocus'
import { useFocusTrapOptions } from './useFocusTrapOptions'
import { useHandleDayClick } from './useHandleDayClick'
import { useInput } from './useInput'
import { useRangeHoverOrFocusDate } from './useRangeHoverOrFocusDate'
import { useStatefulRef } from '../../hooks/useStatefulRef'

export type DatePickerDateValidityType = ValueOf<typeof DATE_VALIDITY>

export interface DatePickerOnChangeData {
  startDate: Date | null
  startDateValidity: DatePickerDateValidityType | null
  endDate: Date | null
  endDateValidity: DatePickerDateValidityType | null
}

export interface DatePickerProps
  extends ComponentWithClass,
    InputValidationProps {
  /**
   * The end of the selected date range. (Only relevant if isRange is set.)
   *
   * If set, it should be kept updated with the `endDate` value provided
   * by the `onChange` callback.
   */
  endDate?: Date | null
  /**
   * Custom date format (e.g. `yyyy/MM/dd`).
   */
  format?: string
  /**
   * Optional unique ID to apply to the component.
   */
  id?: string
  /**
   * Toggles whether the component is disabled or not (preventing user interaction).
   */
  isDisabled?: boolean
  /**
   * Toggles whether the component is a range variant (allowing selection of start and end dates).
   */
  isRange?: boolean
  /**
   * Optional text label to display within the picker input.
   */
  label?: string
  /**
   * Optional HTML `name` attribute to apply to the component.
   */
  name?: string
  /**
   * Optional handler to be invoked when the blur event is emitted.
   */
  onBlur?: (event: React.FormEvent) => void
  /**
   * Optional handler to be invoked when the value of the component changes.
   *
   * Note: If an invalid date is typed, `data.startDate` will be set to an
   * invalid date object and the `data.startDateValidity` will be set to
   * `"invalid"`. (If you're using `yup` for validation, you may wish to
   * use the `.typeError()` chainer to display an appropriate error message.)
   *
   * If a date that is disabled using the `disabledDays` prop is typed,
   * `data.startDate` will be populated and `data.startDateValidity` will
   * be set to `"disabled"`. You should check for this and ensure an
   * appropriate error message is displayed.
   */
  onChange?: (data: DatePickerOnChangeData) => void
  /**
   * The selected date, or the start of the selected date range if `isRange`
   * is set.
   *
   * If set, it should be kept updated with the `startDate` provided
   * by the `onChange` callback.
   */
  startDate?: Date | null
  /**
   * Toggles whether the picker is open on first render.
   */
  initialIsOpen?: boolean
  /**
   * An array of dates to disabled within the picker, preventing them from
   * being selected in the date picker calendar.
   *
   * Note that these dates can still be manually typed in. You should still
   * check for them in your validation logic and display an appropriate
   * error message if they are received. See the `onChange` prop for more
   * information.
   */
  disabledDays?: DayPickerProps['disabled']
  /**
   * Optional month from which to display the picker calendar on first render.
   */
  initialMonth?: DayPickerProps['defaultMonth']
  /**
   * Initial value for `startDate`. Only used when the `startDate` prop is not set.
   */
  initialStartDate?: Date | null
  /**
   * Initial value for `endDate`. Only used when the `endDate` prop is not set.
   */
  initialEndDate?: Date | null
  /**
   * Position to display the picker relative to the input.
   * NOTE: This is now calculated automatically by default based on available screen real-estate.
   */
  placement?: Placement
  /**
   * Optional override for the date marked as today in the picker.
   * Can be used for e.g. visual regression testing.
   */
  today?: Date
  /**
   * Not used. Use `startDate` and `endDate` instead.
   */
  value?: never
  /**
   * Enable the Jump To Today button that sets the current date to today.
   */
  jumpToToday?: boolean
  /**
   * Enable navigation via the Month and Year grids.
   */
  navigateMonthYear?: boolean
}

export const DatePicker = ({
  className,
  endDate: externalEndDate,
  format: datePickerFormat = DATE_FORMAT.SHORT,
  id: externalId,
  isDisabled = false,
  isInvalid,
  isRange = false,
  label = 'Date',
  onChange,
  startDate: externalStartDate,
  initialIsOpen = false,
  disabledDays,
  initialMonth,
  initialStartDate = null,
  initialEndDate = null,
  placement = 'bottom-start',
  navigateMonthYear = false,
  jumpToToday = false,
  onBlur,
  today = new Date(),

  // Formik can pass value – drop it to stop it being forwarded to the input
  value: _,

  ...rest
}: DatePickerProps) => {
  const id = useExternalId(externalId)
  const titleId = useExternalId('datepicker-title')
  const floatingBoxId = useExternalId('datepicker-contentId')

  const buttonRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [isOpen, setIsOpen] = useState(initialIsOpen)
  const [calendarTable, setCalendarTable] = useState<CalendarTableView>(
    CALENDAR_TABLE_VIEW.HIDE
  )

  const { hasFocus, onLocalBlur, onLocalFocus } = useFocus()

  const close = useCallback(() => setIsOpen(false), [])

  const toggleIsOpen = useCallback(
    () => setIsOpen((previousIsOpen) => !previousIsOpen),
    []
  )

  const focusTrapOptions = useFocusTrapOptions(
    close,
    isRange ? [buttonRef, inputRef] : [buttonRef]
  )

  const [state, dispatch] = useDatePickerReducer(
    externalStartDate,
    externalEndDate,
    initialStartDate,
    initialEndDate,
    datePickerFormat,
    isRange,
    initialMonth
  )

  const handleDayClick = useHandleDayClick(
    state,
    dispatch,
    isRange,
    disabledDays,
    onChange
  )

  const { startDate, endDate, currentMonth } = state

  const hasError =
    state.hasError || isInvalid || hasClass(className, 'is-invalid')

  const [floatingBoxTarget, setFloatingBoxTarget] = useStatefulRef()

  const {
    rangeHoverOrFocusDate,
    handleDayFocusOrMouseEnter,
    handleDayBlurOrMouseLeave,
  } = useRangeHoverOrFocusDate(isRange)

  const { handleKeyDown, handleInputBlur, handleInputChange } = useInput(
    datePickerFormat,
    isRange,
    handleDayClick,
    dispatch
  )

  const modifiers = {
    start: replaceInvalidDate(startDate) || false,
    end: replaceInvalidDate(endDate) || false,
  }
  const modifiersClassNames = {
    start: 'rdp-day_start',
    end: 'rdp-day_end',
  }

  const selected = {
    from: replaceInvalidDate(startDate),
    to: replaceInvalidDate(endDate) || rangeHoverOrFocusDate || undefined,
  }

  const hasContent = Boolean(startDate)

  const placeholder = !isRange ? datePickerFormat.toLowerCase() : undefined

  const handleDaySelection = () => {
    dispatch({ type: DATEPICKER_ACTION.REFRESH_HAS_ERROR })
    dispatch({ type: DATEPICKER_ACTION.REFRESH_INPUT_VALUE })
  }

  return (
    <>
      <StyledDatePickerInput
        className={className}
        data-testid="datepicker-input-wrapper"
        $isDisabled={isDisabled}
        ref={setFloatingBoxTarget}
      >
        <StyledOuterWrapper
          data-testid="datepicker-outer-wrapper"
          $hasFocus={hasFocus && !isRange}
          $isInvalid={hasError}
          $isDisabled={isDisabled}
        >
          <StyledInputWrapper $isRange={isRange}>
            <StyledLabel
              id={titleId}
              $hasFocus={hasFocus && !isRange}
              $hasContent={hasContent}
              htmlFor={id}
              data-testid="datepicker-label"
            >
              {label}
              {placeholder && ` (${placeholder})`}
            </StyledLabel>
            <StyledInput
              ref={inputRef}
              $hasLabel={Boolean(label)}
              aria-label="Choose date"
              data-testid="datepicker-input"
              id={id}
              type="text"
              disabled={isDisabled}
              readOnly={isRange}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={(e) => {
                onLocalBlur(e)
                handleInputBlur()
                if (isDateValid(state.startDate)) {
                  dispatch({
                    type: DATEPICKER_ACTION.UPDATE,
                    data: { currentMonth: state.startDate },
                  })
                }
                if (onBlur) {
                  onBlur(e)
                }
              }}
              onFocus={() => {
                onLocalFocus()
                if (isRange) {
                  buttonRef.current?.focus()
                }
              }}
              onClick={() => {
                if (isRange) {
                  toggleIsOpen()
                }
              }}
              placeholder={placeholder}
              value={state.inputValue}
              {...rest}
            />
          </StyledInputWrapper>
          <StyledInlineButtons>
            <InlineButton
              aria-expanded={isOpen}
              aria-label={`${isOpen ? 'Hide' : 'Show'} day picker`}
              aria-owns={floatingBoxId}
              data-testid="datepicker-input-button"
              isDisabled={isDisabled}
              onClick={() => {
                toggleIsOpen()
                setCalendarTable(CALENDAR_TABLE_VIEW.HIDE)
              }}
              ref={buttonRef}
            >
              <IconEvent size={18} />
            </InlineButton>
          </StyledInlineButtons>
        </StyledOuterWrapper>
      </StyledDatePickerInput>
      <StyledFloatingBox
        id={floatingBoxId}
        isVisible={isOpen}
        placement={placement}
        targetElement={floatingBoxTarget}
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
        aria-live="polite"
      >
        <FocusTrap focusTrapOptions={focusTrapOptions}>
          <div>
            {(
              [
                CALENDAR_TABLE_VIEW.YEARS,
                CALENDAR_TABLE_VIEW.MONTHS,
              ] as CalendarTableView[]
            ).includes(calendarTable) && (
              <CalendarTable
                month={currentMonth}
                dispatch={dispatch}
                calendarTable={calendarTable}
                setCalendarTable={setCalendarTable}
              />
            )}
            {jumpToToday && (
              <StyledJumpToToday
                variant={BUTTON_VARIANT.TERTIARY}
                size={COMPONENT_SIZE.SMALL}
                aria-label="Jump to today"
                aria-disabled="false"
                onClick={() => {
                  if (isDateDisabled(today, disabledDays)) {
                    return
                  }

                  dispatch({
                    type: DATEPICKER_ACTION.UPDATE,
                    data: { currentMonth: today },
                  })

                  handleDayClick(today)
                  handleDaySelection()
                }}
              >
                Jump to today
              </StyledJumpToToday>
            )}
            <StyledNMYContainer>
              {navigateMonthYear && (
                <CalendarNavigation
                  month={currentMonth}
                  dispatch={dispatch}
                  setCalendarTable={setCalendarTable}
                />
              )}
              <StyledDayPicker
                locale={enGB}
                formatters={{
                  formatWeekdayName: (date, options) =>
                    format(date, 'ccc', options),
                }}
                mode="default"
                modifiers={modifiers}
                modifiersClassNames={modifiersClassNames}
                selected={selected}
                today={today}
                onDayClick={(day, { disabled }) => {
                  if (disabled) {
                    return
                  }

                  const newState = handleDayClick(day)

                  handleDaySelection()

                  if (newState.endDate || !isRange) {
                    setTimeout(() => close())
                  }
                }}
                month={currentMonth}
                onMonthChange={(month) => {
                  dispatch({
                    type: DATEPICKER_ACTION.UPDATE,
                    data: { currentMonth: month },
                  })
                }}
                disabled={disabledDays}
                onDayMouseEnter={handleDayFocusOrMouseEnter}
                onDayMouseLeave={handleDayBlurOrMouseLeave}
                onDayFocus={handleDayFocusOrMouseEnter}
                onDayBlur={handleDayBlurOrMouseLeave}
                initialFocus
              />
            </StyledNMYContainer>
          </div>
        </FocusTrap>
      </StyledFloatingBox>
    </>
  )
}

DatePicker.displayName = 'DatePicker'
