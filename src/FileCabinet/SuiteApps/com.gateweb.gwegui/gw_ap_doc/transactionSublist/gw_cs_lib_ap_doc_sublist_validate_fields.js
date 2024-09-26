define([
  '../field_validation/gw_lib_string',
  '../vo/gw_ap_doc_fields',
  '../application/gw_service_ap_doc_type_options',
  '../application/gw_service_ap_doc_consolidate_mark_options',
  '../application/gw_service_ap_doc_tax_type_options',
  '../application/gw_service_assign_log_track',
  '../application/gw_service_ap_doc_apply_period',
  '../field_validation/gw_lib_error_messages',
  '../field_validation/gw_lib_field_validation_gui_number',
  '../field_validation/gw_lib_field_validation_common_number',
  '../field_validation/gw_lib_field_validation_tax_id_number',
  '../field_validation/gw_lib_field_validation_tax_amt',
  '../field_validation/gw_lib_field_validation_taxable_sales_amt',
  '../field_validation/gw_lib_field_validation_tax_exempt_sales_amt',
  '../field_validation/gw_lib_field_validation_tax_zero_sales_amt'
], function (
  stringUtil,
  apDocFields,
  apDocTypeService,
  apDocConsolidationMarkService,
  apDocTaxTypeService,
  assignLogTrackService,
  applyPeriodService,
  GwError,
  guiNumberValidator,
  commonNumberValidator,
  taxIdValidator,
  taxAmtValidator,
  salesAmtValidator,
  taxExemptSalesAmtValidator,
  taxZeroSalesAmtValidator
) {
  /**
   * Module Description...
   *
   * @type {Object} module-name
   *
   * @copyright 2020 Gateweb
   * @author Sean Lin <seanlin816@gmail.com>
   *
   * @NApiVersion 2.x
   * @NModuleScope Public
   */

  var exports = {}
  var apSublistId = 'recmachcustrecord_gw_apt_doc_tran_id'
  var getCurrencySublistFieldValue = floatWrapper(getSublistValue)
  var getNumberSublistFieldValue = integerWrapper(getSublistValue)
  var getDateTimeSublistFieldValue = dateTimeWrapper(getSublistValue)
  var currentTransactionRecord = null
  var currentContext = null
  var currentSublistApDocRecord = null

  function setCurrentSublistApDocRecord(inputRecord) {
    currentSublistApDocRecord = inputRecord
  }

  function setCurrentContext(inputContext) {
    currentContext = inputContext
    currentTransactionRecord = inputContext.currentRecord
  }

  //region validateGuiNumber
  /**
   * <code>validateGuiNumber</code> event handler
   *
   * @gov XXX
   *
   * @param context
   *    {Object}
   * @param context.currentRecord
   *    {record} The current record the user is manipulating in the UI
   * @param context.sublistId
   *    {string} The internal ID of the sublist.
   * @param context.fieldId
   *    {string} The internal ID of the field being validated.
   * @param [context.lineNum=undefined]
   *    {string} The index of the line if the field is in a sublist or
   *      matrix.
   * @param [context.columnNum=undefined]
   *    {string} The index of the column if the field is in a matrix.
   *
   * @return {{isValid: {boolean} ,error: {Object}[]}}
   *
   * @static
   * @function validateGuiNumber
   */
  function validateGuiNumber(context, fieldValue) {
    console.log('validateGuiNumber fieldValue', fieldValue)
    var resultObj = {
      isValid: true,
      error: []
    }
    var guiNumber = fieldValue // getSublistValue(context.fieldId)
    var docType = apDocTypeService.getDocTypeCodeByRecordId(
      getNumberSublistFieldValue(apDocFields.fields.docType.id)
    )
    console.log('docType', docType)
    console.log(
      'docType value',
      getNumberSublistFieldValue(apDocFields.fields.docType.id)
    )
    console.log('currentSublistId', currentSublistApDocRecord.id)
    if (parseInt(docType) !== 24 && parseInt(docType) !== 23 &&
      guiNumberValidator.isGuiNumberDuplicated(
        guiNumber,
        currentSublistApDocRecord.id,
        parseInt(docType)
      )
    ) {
      resultObj.isValid = false
      resultObj.error.push(GwError.GuiNumberDuplicated)
      return resultObj
    }
    console.log('validateGuiNumber docType', docType)
    if (guiNumberValidator.isGuiNumberRequired(docType)) {
      resultObj = validateRequiredGuiNumber(guiNumber, docType)
    }
    if (guiNumberValidator.isGuiNumberOptional(docType)) {
      resultObj = validateOptionalGuiNumber(guiNumber, docType)
    }
    if (guiNumberValidator.isGuiNumberMustNotHave(docType)) {
      resultObj = validateMustNotHaveGuiNumber(guiNumber)
    }

    console.log('validateGuiNumber result', resultObj)
    return resultObj
    // return true
  }

  function validateOptionalGuiNumber(value, docType) {
    var resultObj = {
      isValid: true,
      error: []
    }
    // Check with common number
    var commonNumber = getSublistValue(apDocFields.fields.commonNumber.id)
    if (
      (stringUtil.isNullOrEmpty(commonNumber) &&
        stringUtil.isNullOrEmpty(value)) ||
      (!stringUtil.isNullOrEmpty(commonNumber) &&
        !stringUtil.isNullOrEmpty(value))
    ) {
      resultObj.isValid = false
      resultObj.error.push(GwError.GuiNumberCommonNumberConflictError)
      return resultObj
    }
    if (!stringUtil.isNullOrEmpty(value)) {
      resultObj = validateGuiNumberValue(value, docType)
    }
    return resultObj
  }

  function validateRequiredGuiNumber(value, docType) {
    var resultObj = {
      isValid: true,
      error: []
    }
    if (stringUtil.isNullOrEmpty(value)) {
      resultObj.isValid = false
      resultObj.error.push(GwError.GuiNumberRequired)
      return resultObj
    }
    resultObj = validateGuiNumberValue(value, docType)
    console.log('validateRequiredGuiNumber resultObj', resultObj)
    return resultObj
  }

  function validateMustNotHaveGuiNumber(value) {
    var resultObj = {
      isValid: true,
      error: []
    }
    if (!stringUtil.isNullOrEmpty(value)) {
      resultObj.isValid = false
      resultObj.error.push(GwError.GuiNumberMustNotHaveValueError)
    }
    return resultObj
  }

  function validateGuiNumberValue(value, docType) {
    var resultObj = {
      isValid: true,
      error: []
    }

    if (!guiNumberValidator.isFormatValid(value)) {
      resultObj.isValid = false
      resultObj.error.push(GwError.GuiFormatError)
    } else {
      initAvailableGuiTrack()
      if (guiNumberValidator.isGuiTrackValidationRequired(docType)) {
        if (!guiNumberValidator.isTrackValid(value)) {
          resultObj.isValid = false
          resultObj.error.push(GwError.GuiTrackError)
        } else {
          console.log('validateGuiNumber track is valid')
        }
      } else {
        console.log('validateGuiNumber no check track')
      }
    }
    return resultObj
  }

  function initAvailableGuiTrack() {
    console.log('initAvailableGuiTrack')
    var docTypeFieldValue = getNumberSublistFieldValue(
      apDocFields.fields.docType.id
    )
    var docTypeObj =
      apDocTypeService.getDocTypeAndMofDocTypeByRecordId(docTypeFieldValue)
    var guiDate = getSublistValue(apDocFields.fields.guiDate.id)
    var guiPeriod = applyPeriodService.convertGuiPeriod(guiDate)
    var applyPeriod = getSublistValue(apDocFields.fields.applyPeriod.id)
    if (!docTypeFieldValue || !applyPeriod) return true
    console.log('initAvailableGuiTrack docTypeObj', docTypeObj)
    console.log('initAvailableGuiTrack guiPeriod', guiPeriod)
    var availableTrack = assignLogTrackService.getAvailableGuiTrack(
      docTypeObj,
      guiPeriod
    )
    console.log('initAvailableGuiTrack availableTrack', availableTrack)
    guiNumberValidator.setAvailableTrackValues(availableTrack)
  }

  function isRecordInEditMode() {
    return parseInt(currentSublistApDocRecord.id) > 0
  }

  //endregion

  //region validate common number
  /**
   * <code>validateCommonNumber</code> event handler
   *
   * @gov XXX
   *
   * @param context
   *    {Object}
   * @param context.currentRecord
   *    {record} The current record the user is manipulating in the UI
   * @param context.sublistId
   *    {string} The internal ID of the sublist.
   * @param context.fieldId
   *    {string} The internal ID of the field being validated.
   * @param [context.lineNum=undefined]
   *    {string} The index of the line if the field is in a sublist or
   *      matrix.
   * @param [context.columnNum=undefined]
   *    {string} The index of the column if the field is in a matrix.
   *
   * @return {{isValid: {boolean} ,error: {Object}[]}}
   *
   * @static
   * @function validateCommonNumber
   */
  function validateCommonNumber(context, fieldValue) {
    console.log('validateCommonNumber fieldValue', fieldValue)
    var resultObj = {
      isValid: true,
      error: []
    }
    var guiNumber = getSublistValue(apDocFields.fields.guiNum.id)
    console.log('validateCommonNumber guiNumber', guiNumber)
    var commonNumber = fieldValue
    var docType = apDocTypeService.getDocTypeCodeByRecordId(
      getNumberSublistFieldValue(apDocFields.fields.docType.id)
    )
    console.log('validateCommonNumber, docType', docType)

    var consolidationMark =
      apDocConsolidationMarkService.getConsolidateMarkValueByRecordId(
        getNumberSublistFieldValue(apDocFields.fields.consolidationMark.id)
      )
    console.log('validateCommonNumber consolidationMark', consolidationMark)

    if (commonNumberValidator.isCommonNumberMustNotHave(docType)) {
      console.log('validateCommonNumber common number must not have')
      resultObj = validateCommonNumberForbidden(commonNumber)
    }
    if (commonNumberValidator.isCommonNumberRequired(docType)) {
      console.log('validateCommonNumber common number must have')
      resultObj = validateCommonNumberRequired(commonNumber, docType)
    }
    if (commonNumberValidator.isCommonNumberOptional(docType)) {
      console.log('validateCommonNumber common number is optional')
      resultObj = validateCommonNumberOptional(docType, commonNumber)
    }
    console.log('validateCommonNumber, resultObj', resultObj)
    return resultObj
    // return true
  }

  function validateCommonNumberForbidden(value) {
    var resultObj = {
      isValid: true,
      error: []
    }
    if (!stringUtil.isNullOrEmpty(value)) {
      resultObj.isValid = false
      resultObj.error.push(GwError.CommonNumberMustNotHave)
    }
    return resultObj
  }

  function validateCommonNumberRequired(value, docType) {
    var resultObj = {
      isValid: true,
      error: []
    }
    if (stringUtil.isNullOrEmpty(value)) {
      resultObj.isValid = false
      resultObj.error.push(GwError.CommonNumberRequired)
      return resultObj
    }
    if (!commonNumberValidator.isExportNumberLenghValid(value)) {
      resultObj.isValid = false
      resultObj.error.push(GwError.CommonNumberCustomLenthError)
    }

    return resultObj
  }

  function validateCommonNumberOptional(docType, value) {
    var resultObj = {
      isValid: true,
      error: []
    }
    var guiNumber = getSublistValue(apDocFields.fields.guiNum.id)
    if (
      isBothNumberExists(value, guiNumber) ||
      isBothNumberNotExists(value, guiNumber)
    ) {
      resultObj.isValid = false
      resultObj.error.push(GwError.GuiNumberCommonNumberConflictError)
      return resultObj
    }
    if (!stringUtil.isNullOrEmpty(value)) {
      console.log('validateCommonNumber validate number value')
      resultObj = validateCommonNumberValue(docType, value)
    }
    return resultObj
  }

  function isBothNumberExists(commonNumber, guiNumber) {
    return
    !stringUtil.isNullOrEmpty(guiNumber) &&
      !stringUtil.isNullOrEmpty(commonNumber)
  }

  function isBothNumberNotExists(commonNumber, guiNumber) {
    return (
      stringUtil.isNullOrEmpty(guiNumber) &&
      stringUtil.isNullOrEmpty(commonNumber)
    )
  }

  function validateCommonNumberValue(docType, value) {
    var resultObj = {
      isValid: true,
      error: []
    }
    console.log('validatCommonNumberValue docType', docType)
    console.log('validatCommonNumberValue value', value)
    if (!commonNumberValidator.isLengthValid(docType, value)) {
      resultObj.isValid = false
      resultObj.error.push(GwError.GuiFormatError)
    }
    if (docType === 25 && !commonNumberValidator.isFormatValid(value)) {
      resultObj.isValid = false
      resultObj.error.push(GwError.CommonNumberFormatError)
    }
    if (
      docType !== 25 &&
      commonNumberValidator.isFormatSimilarToGuiNumber(value)
    ) {
      resultObj.isValid = false
      resultObj.error.push(GwError.CommonNumberSimilarToGuiNumber)
    }

    return resultObj
  }

  //endregion

  //region validate buyer tax id
  /**
   * <code>validateBuyerTaxId</code> event handler
   *
   * @gov XXX
   *
   * @param context
   *    {Object}
   * @param context.currentRecord
   *    {record} The current record the user is manipulating in the UI
   * @param context.sublistId
   *    {string} The internal ID of the sublist.
   * @param context.fieldId
   *    {string} The internal ID of the field being validated.
   * @param [context.lineNum=undefined]
   *    {string} The index of the line if the field is in a sublist or
   *      matrix.
   * @param [context.columnNum=undefined]
   *    {string} The index of the column if the field is in a matrix.
   *
   * @return {{isValid: {boolean} ,error: {Object}[]}}
   *
   * @static
   * @function validateBuyerTaxId
   */
  function validateBuyerTaxId(context, value) {
    console.log('validateBuyerTaxId fieldValue', value)
    var resultObj = {
      isValid: true,
      error: []
    }
    if (stringUtil.isNullOrEmpty(value.toString())) {
      resultObj.isValid = false
      resultObj.error.push(GwError.BuyerTaxIdRequired)
      return resultObj
    }
    if (!taxIdValidator.isLengthValid(value)) {
      resultObj.isValid = false
      resultObj.error.push(GwError.BuyerTaxIdLengthNotValid)
      return resultObj
    }
    if (!taxIdValidator.isNumberCalculatedValid(value)) {
      resultObj.isValid = false
      resultObj.error.push(GwError.BuyerTaxIdNotValid)
      return resultObj
    }
    return resultObj
  }

  //endregion

  //region valid seller tax id
  /**
   * <code>validateSellerTaxId</code> event handler
   *
   * @gov XXX
   *
   * @param context
   *    {Object}
   * @param context.currentRecord
   *    {record} The current record the user is manipulating in the UI
   * @param context.sublistId
   *    {string} The internal ID of the sublist.
   * @param context.fieldId
   *    {string} The internal ID of the field being validated.
   * @param [context.lineNum=undefined]
   *    {string} The index of the line if the field is in a sublist or
   *      matrix.
   * @param [context.columnNum=undefined]
   *    {string} The index of the column if the field is in a matrix.
   *
   * @return {{isValid: {boolean} ,error: {Object}[]}}
   *
   * @static
   * @function validateSellerTaxId
   */
  function validateSellerTaxId(context, value) {
    console.log('validateSellerTaxId fieldValue', value)
    var resultObj = {}
    var consolidationMark =
      apDocConsolidationMarkService.getConsolidateMarkValueByRecordId(
        getNumberSublistFieldValue(apDocFields.fields.consolidationMark.id)
      )
    var docType = apDocTypeService.getDocTypeCodeByRecordId(
      getNumberSublistFieldValue(apDocFields.fields.docType.id)
    )
    var guiNumber = getSublistValue(apDocFields.fields.guiNum.id)

    if (isSellerTaxIdRequired(docType, consolidationMark, guiNumber)) {
      resultObj = validateSellerTaxIdRequired(value)
    } else if (taxIdValidator.isMustNotHave(docType)) {
      resultObj = validateSellerTaxIdMustNotHave(value)
    } else {
      resultObj = validateSellerTaxIdOptional(value, consolidationMark)
    }

    return resultObj
  }

  function isSellerTaxIdRequired(docType, consolidationMark, guiNumber) {
    var requiredTaxIdDocType = [21, 23, 24]
    var isRequired = requiredTaxIdDocType.indexOf(docType) > -1
    isRequired =
      isRequired ||
      (!apDocConsolidationMarkService.isConsolidate(consolidationMark) &&
        docType === 25)
    isRequired =
      isRequired ||
      (apDocConsolidationMarkService.isSingle(consolidationMark) &&
        !stringUtil.isNullOrEmpty(guiNumber))

    return isRequired
  }

  function validateSellerTaxIdOptional(value) {
    var resultObj = {
      isValid: true,
      error: []
    }
    if (!stringUtil.isNullOrEmpty(value)) {
      if (!taxIdValidator.isLengthValid(value.toString())) {
        resultObj.isValid = false
        resultObj.error.push(GwError.SellerTaxIdLengthError)
      }
      if (!taxIdValidator.isNumberCalculatedValid(value.toString())) {
        resultObj.isValid = false
        resultObj.error.push(GwError.SellerTaxIdValueError)
      }
      return resultObj
    }

    return resultObj
  }

  function validateSellerTaxIdRequired(value) {
    var resultObj = {
      isValid: true,
      error: []
    }
    if (stringUtil.isNullOrEmpty(value.toString())) {
      resultObj.isValid = false
      resultObj.error.push(GwError.SellerTaxIdRequired)
      return resultObj
    }
    if (!taxIdValidator.isLengthValid(value.toString())) {
      resultObj.isValid = false
      resultObj.error.push(GwError.SellerTaxIdLengthError)
    }
    if (!taxIdValidator.isNumberCalculatedValid(value.toString())) {
      resultObj.isValid = false
      resultObj.error.push(GwError.SellerTaxIdValueError)
    }
    return resultObj
  }

  function validateSellerTaxIdMustNotHave(value) {
    var resultObj = {
      isValid: true,
      error: []
    }
    if (!stringUtil.isNullOrEmpty(value.toString())) {
      resultObj.isValid = false
      resultObj.error.push(GwError.SellerTaxIdMustNotHave)
    }
    return resultObj
  }

  //endregion

  //region validate Sales Amt
  /**
   * <code>validateSalesAmt</code> event handler
   *
   * @gov XXX
   *
   * @param context
   *    {Object}
   * @param context.currentRecord
   *    {record} The current record the user is manipulating in the UI
   * @param context.sublistId
   *    {string} The internal ID of the sublist.
   * @param context.fieldId
   *    {string} The internal ID of the field being validated.
   * @param [context.lineNum=undefined]
   *    {string} The index of the line if the field is in a sublist or
   *      matrix.
   * @param [context.columnNum=undefined]
   *    {string} The index of the column if the field is in a matrix.
   *
   * @return {{isValid: {boolean} ,error: {Object}[]}}
   *
   * @static
   * @function validateSalesAmt
   */
  function validateSalesAmt(context, value) {
    var resultObj = {
      isValid: true,
      error: []
    }
    if (!salesAmtValidator.isLengthValid(value)) {
      resultObj.isValid = false
      resultObj.error.push(GwError.SalesAmtLengthError)
    }
    var taxType = getNumberSublistFieldValue(
      currentSublistApDocRecord[apDocFields.fields.taxType.id]
    )
    if (!salesAmtValidator.isValueValid(value, taxType)) {
      resultObj.isValid = false
      if (taxType === 1 || taxType === 4) {
        resultObj.error.push(GwError.SalesAmtShouldBeGreaterThanZero)
      }
      if (taxType === 2 || taxType === 3) {
        resultObj.error.push(GwError.SalesAmtShouldBeZero)
      }
    }
    return resultObj
  }

  //endregion

  //region validate tax exempt sales amount
  /**
   * <code>validateTaxExemptSalesAmt</code> event handler
   *
   * @gov XXX
   *
   * @param context
   *    {Object}
   * @param context.currentRecord
   *    {record} The current record the user is manipulating in the UI
   * @param context.sublistId
   *    {string} The internal ID of the sublist.
   * @param context.fieldId
   *    {string} The internal ID of the field being validated.
   * @param [context.lineNum=undefined]
   *    {string} The index of the line if the field is in a sublist or
   *      matrix.
   * @param [context.columnNum=undefined]
   *    {string} The index of the column if the field is in a matrix.
   *
   * @return {{isValid: {boolean} ,error: {Object}[]}}
   *
   * @static
   * @function validateTaxExemptSalesAmt
   */
  function validateTaxExemptSalesAmt(context, value) {
    var resultObj = {
      isValid: true,
      error: []
    }
    if (!taxExemptSalesAmtValidator.isLengthValid(value)) {
      resultObj.isValid = false
      resultObj.error.push(GwError.SalesAmtLengthError)
    }
    var taxType = getNumberSublistFieldValue(
      currentSublistApDocRecord[apDocFields.fields.taxType.id]
    )
    if (!taxExemptSalesAmtValidator.isValueValid(value, taxType)) {
      resultObj.isValid = false
      if (taxType === 3 || taxType === 4) {
        resultObj.error.push(GwError.SalesAmtShouldBeGreaterThanZero)
      }
      if (taxType === 2 || taxType === 1) {
        resultObj.error.push(GwError.SalesAmtShouldBeZero)
      }
    }
    return resultObj
  }

  //endregion

  //region validate zero tax sales amount
  /**
   * <code>validateTaxZeroSalesAmt</code> event handler
   *
   * @gov XXX
   *
   * @param context
   *    {Object}
   * @param context.currentRecord
   *    {record} The current record the user is manipulating in the UI
   * @param context.sublistId
   *    {string} The internal ID of the sublist.
   * @param context.fieldId
   *    {string} The internal ID of the field being validated.
   * @param [context.lineNum=undefined]
   *    {string} The index of the line if the field is in a sublist or
   *      matrix.
   * @param [context.columnNum=undefined]
   *    {string} The index of the column if the field is in a matrix.
   *
   * @return {{isValid: {boolean} ,error: {Object}[]}}
   *
   * @static
   * @function validateSalesAmt
   */
  function validateTaxZeroSalesAmt(context, value) {
    var resultObj = {
      isValid: true,
      error: []
    }
    if (!taxZeroSalesAmtValidator.isLengthValid(value)) {
      resultObj.isValid = false
      resultObj.error.push(GwError.TaxAmtLengthError)
    }
    var taxType = getNumberSublistFieldValue(
      currentSublistApDocRecord[apDocFields.fields.taxType.id]
    )
    if (!taxZeroSalesAmtValidator.isValueValid(value, taxType)) {
      resultObj.isValid = false
      if (taxType === 2 || taxType === 4) {
        resultObj.error.push(GwError.SalesAmtShouldBeGreaterThanZero)
      }
      if (taxType === 1 || taxType === 3) {
        resultObj.error.push(GwError.SalesAmtShouldBeZero)
      }
    }
    return resultObj
  }

  //endregion

  //region validate tax amount
  /**
   * <code>validateTaxAmt</code> event handler
   *
   * @gov XXX
   *
   * @param context
   *    {Object}
   * @param context.currentRecord
   *    {record} The current record the user is manipulating in the UI
   * @param context.sublistId
   *    {string} The internal ID of the sublist.
   * @param context.fieldId
   *    {string} The internal ID of the field being validated.
   * @param [context.lineNum=undefined]
   *    {string} The index of the line if the field is in a sublist or
   *      matrix.
   * @param [context.columnNum=undefined]
   *    {string} The index of the column if the field is in a matrix.
   *
   * @return {{isValid: {boolean} ,error: {Object}[]}}
   *
   * @static
   * @function validateTaxAmt
   */
  function validateTaxAmt(context, value) {
    console.log('in validateTaxAmt')
    var resultObj = {
      isValid: true,
      error: []
    }
    var salesAmt = getNumberSublistFieldValue(apDocFields.fields.salesAmt.id)
    console.log('in validateTaxAmt - salesAmt', salesAmt)
    var taxAmt = value
    console.log('in validateTaxAmt - taxAmt', taxAmt)
    var docType = apDocTypeService.getDocTypeCodeByRecordId(
        getNumberSublistFieldValue(apDocFields.fields.docType.id)
    )
    console.log('in validateTaxAmt - docType', docType)
    var guiNumber = getSublistValue(apDocFields.fields.guiNum.id)
    if (!taxAmtValidator.isLengthValid(value)) {
      resultObj.isValid = false
      resultObj.error.push(GwError.TaxAmtLengthError)
    }
    if ((docType !== '22' || guiNumber === '') && !taxAmtValidator.isTaxAmtInAccetableRange(salesAmt, taxAmt)) {
      resultObj.isValid = false
      resultObj.error.push(GwError.TaxAmtOver5Error)
    }
    return resultObj
  }

  //endregion

  //region validate tax id
  // TODO Obsolete
  /**
   * <code>validateTaxId</code> event handler
   *
   * @gov XXX
   *
   * @param context
   *    {Object}
   * @param context.currentRecord
   *    {record} The current record the user is manipulating in the UI
   * @param context.sublistId
   *    {string} The internal ID of the sublist.
   * @param context.fieldId
   *    {string} The internal ID of the field being validated.
   * @param [context.lineNum=undefined]
   *    {string} The index of the line if the field is in a sublist or
   *      matrix.
   * @param [context.columnNum=undefined]
   *    {string} The index of the column if the field is in a matrix.
   *
   * @return {{isValid: {boolean} ,error: {Object}[]}}
   *
   * @static
   * @function validateTaxId
   */
  function validateTaxId(context, value) {
    var resultObj = {
      isValid: true,
      error: []
    }
    if (!taxIdValidator.isLengthValid(value)) {
      resultObj.isValid = false
      resultObj.error.push(GwError.TaxIdLengthError)
    } else if (!taxIdValidator.isNumberCalculatedValid(value)) {
      resultObj.isValid = false
      resultObj.error.push(GwError.TaxIdValueError)
    }

    return resultObj
  }

  //endregion

  //region validate deduction code
  /**
   * <code>validateDeductionCode</code> event handler
   *
   * @gov XXX
   *
   * @param context
   *    {Object}
   * @param context.currentRecord
   *    {record} The current record the user is manipulating in the UI
   * @param context.sublistId
   *    {string} The internal ID of the sublist.
   * @param context.fieldId
   *    {string} The internal ID of the field being validated.
   * @param [context.lineNum=undefined]
   *    {string} The index of the line if the field is in a sublist or
   *      matrix.
   * @param [context.columnNum=undefined]
   *    {string} The index of the column if the field is in a matrix.
   *
   * @return {{isValid: {boolean} ,error: {Object}[]}}
   *
   * @static
   * @function validateDeductionCode
   */
  function validateDeductionCode(context, value) {
    var resultObj = {
      isValid: true,
      error: []
    }
    var taxType = apDocTaxTypeService.getTaxTypeValueByRecordId(
      getNumberSublistFieldValue(apDocFields.fields.taxType.id)
    )
    var validValues = []
    if (apDocTaxTypeService.isTaxable(taxType)) {
      validValues = [1, 2, 3, 4]
    }
    if (
      apDocTaxTypeService.isZeroTax(taxType) ||
      apDocTaxTypeService.isTaxExempt(taxType)
    ) {
      validValues = [3, 4]
    }
    resultObj.isValid = validValues.indexOf(parseInt(value)) > -1
    if (!resultObj.isValid) {
      // TODO Add Error Message
    }
    return resultObj
  }

  //endregion

  //region validate consolidation mark
  /**
   * <code>validateConsolidationMark</code> event handler
   *
   * @gov XXX
   *
   * @param context
   *    {Object}
   * @param context.currentRecord
   *    {record} The current record the user is manipulating in the UI
   * @param context.sublistId
   *    {string} The internal ID of the sublist.
   * @param context.fieldId
   *    {string} The internal ID of the field being validated.
   * @param [context.lineNum=undefined]
   *    {string} The index of the line if the field is in a sublist or
   *      matrix.
   * @param [context.columnNum=undefined]
   *    {string} The index of the column if the field is in a matrix.
   *
   * @return {{isValid: {boolean} ,error: {Object}[]}}
   *
   * @static
   * @function validateConsolidationMark
   */
  function validateConsolidationMark(context, value) {
    var resultObj = {
      isValid: true,
      error: []
    }
    // TODO Add validateConsolidationMark logic
    return resultObj
  }

  //endregion

  //region validate consolidation mark
  /**
   * <code>validateConsolidationQty</code> event handler
   *
   * @gov XXX
   *
   * @param context
   *    {Object}
   * @param context.currentRecord
   *    {record} The current record the user is manipulating in the UI
   * @param context.sublistId
   *    {string} The internal ID of the sublist.
   * @param context.fieldId
   *    {string} The internal ID of the field being validated.
   * @param [context.lineNum=undefined]
   *    {string} The index of the line if the field is in a sublist or
   *      matrix.
   * @param [context.columnNum=undefined]
   *    {string} The index of the column if the field is in a matrix.
   *
   * @return {{isValid: {boolean} ,error: {Object}[]}}
   *
   * @static
   * @function validateConsolidationQty
   */
  function validateConsolidationQty(context, value) {
    var resultObj = {
      isValid: true,
      error: []
    }
    // TODO Add validateConsolidationQty logic
    return resultObj
  }

  //endregion

  //region Common Functions
  function floatWrapper(func) {
    return function () {
      var value = func.apply(this, arguments)
      return parseFloat(value) || 0
    }
  }

  function integerWrapper(func) {
    return function () {
      var value = func.apply(this, arguments)
      return parseInt(value) || 0
    }
  }

  function dateTimeWrapper(func) {
    return function () {
      var value = func.apply(this, arguments)
      return parseFloat(value) || 0
    }
  }

  function getSublistValue(fieldId) {
    return currentSublistApDocRecord[fieldId]
  }

  //endregion

  exports.validateGuiNumber = validateGuiNumber
  exports.validateCommonNumber = validateCommonNumber
  exports.validateBuyerTaxId = validateBuyerTaxId
  exports.validateSellerTaxId = validateSellerTaxId
  exports.validateTaxId = validateTaxId
  exports.validateTaxAmt = validateTaxAmt
  exports.validateSalesAmt = validateSalesAmt
  exports.validateDeductionCode = validateDeductionCode
  exports.validateTaxExemptSalesAmt = validateTaxExemptSalesAmt
  exports.validateTaxZeroSalesAmt = validateTaxZeroSalesAmt
  exports.validateConsolidationMark = validateConsolidationMark
  exports.validateConsolidationQty = validateConsolidationQty
  exports.setCurrentContext = setCurrentContext
  exports.setCurrentSublistApDocRecord = setCurrentSublistApDocRecord
  return exports
})
