define([
  'N/search',
  'N/runtime',
  'N/url',
  'N/https',
  '../vo/gw_ap_doc_fields',
  '../application/gw_service_ap_doc_type_options',
  './gw_cs_ap_sublist_display',
  '../application/gw_service_ap_doc_consolidate_mark_options',
  '../application/gw_service_ap_doc_currency_options',
  '../application/gw_service_ap_doc_status_options',
  '../application/moment-with-locales',
  '../application/gw_service_ap_doc_apply_period',
  '../application/gw_lib_wrapper',
  '../application/gw_service_ap_doc_apply_month',
], function (
  search,
  runtime,
  url,
  https,
  apDocFields,
  apDocTypeService,
  sublistDisplay,
  apDocConsolidateMarkService,
  apDocCurrencyService,
  apDocStatusService,
  moment,
  applyPeriodService,
  wrapperLib,
  applyMonthService
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

  function setCurrentRecord(inputRecord) {
    currentTransactionRecord = inputRecord
  }

  function setCurrentContext(inputContext) {
    currentContext = inputContext
    currentTransactionRecord = inputContext.currentRecord
  }

  /**
   * <code>DocumentTypeChanged</code> event handler
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
   *    {string} The internal ID of the field that was changed.
   * @param [context.lineNum=undefined]
   *    {string} The index of the line if the field is in a sublist or
   *      matrix.
   * @param [context.columnNum=undefined]
   *    {string} The index of the column if the field is in a matrix.
   *
   * @return {void}
   *
   * @static
   * @function DocumentTypeChanged
   */
  function documentTypeChanged(context) {
    var selectedDocTypeId = getSublistValue(apDocFields.fields.docType.id)
    if (!selectedDocTypeId || selectedDocTypeId === '') {
      console.log('null value')
      return
    }
    var docTypeCode = apDocTypeService.getDocTypeCodeByRecordId(
      selectedDocTypeId
    )
    console.log('docTypeCode', docTypeCode)
    sublistDisplay.setCurrentContext(context)
    sublistDisplay.displaySublistFields(docTypeCode)
    if (parseInt(docTypeCode) === 26 || parseInt(docTypeCode) === 27) {
      setConsolidateMarkToA()
      // consolidationMarkChanged(context)
    }

    var subsidiary = context.currentRecord.getValue({
      fieldId: 'subsidiary'
    })
    setDocStatus()
    setApplyPeriod()
    setCurrency()
    setBuyer(subsidiary)
    if (context.currentRecord.type !== 'expensereport') {
      console.log('In Expense Report Record')
      setSeller()
    }
    clearDisabledFieldsContent(docTypeCode)
    var taxType = getNumberSublistFieldValue(apDocFields.fields.taxType.id)
    if (taxType) {
      taxTypeChanged(context)
    }
  }

  var setDocStatus = setDocStatusCore
  var setApplyPeriod = setApplyPeriodCore
  var setCurrency = setCurrencyCore
  var setBuyer = setBuyerCore
  var setSeller = setSellerCore
  var clearDisabledFieldsContent = clearDisabledFieldsContentCore

  function setDocStatusCore() {
    var defaultDocStatus = apDocStatusService.getStatusByValue(1)
    var currentStatusValue = getNumberSublistFieldValue(
      apDocFields.fields.guiStatus.id
    )
    if (!currentStatusValue) {
      setSublistValue(apDocFields.fields.guiStatus.id, defaultDocStatus)
    }
  }

  function setApplyPeriodCore() {
    var currentApplyPeriodValue = getCurrencySublistFieldValue(
      apDocFields.fields.applyPeriod.id
    )
    var currentApplyMonthValue = getCurrencySublistFieldValue(
        apDocFields.fields.applyMonth.id
    )
    if (!currentApplyPeriodValue || currentApplyPeriodValue === '') {
      var applyPeriod = applyPeriodService.convertGuiPeriod(moment())
      var applyPeriodRecord = applyPeriodService.getRecordByValue(applyPeriod)
      setSublistValue(
        apDocFields.fields.applyPeriodSelect.id,
        applyPeriodRecord.id
      )
    }
    if (!currentApplyMonthValue || currentApplyMonthValue === '') {
      var applyMonth = applyMonthService.convertToApplyMonth()
      var applyMonthRecordId = applyMonthService.getRecordByValue(applyMonth)
      setSublistValue(
          apDocFields.fields.applyMonth.id,
          applyMonthRecordId
      )
    }
  }

  function setBuyerCore(subsidiary) {
    console.log('setBuyerCore subsidiary', subsidiary)
    var buyerTaxId = getSublistValue(apDocFields.fields.buyerTaxId.id)
    var buyerName = getSublistValue(apDocFields.fields.buyerName.id)
    var buyerInfo = getBuyer(subsidiary)
    console.log('setBuyerCore buyerInfo', buyerInfo)
    if (
      isStringEmptyOrNull(buyerTaxId) &&
      !isStringEmptyOrNull(buyerInfo.taxId)
    ) {
      setSublistValue(apDocFields.fields.buyerTaxId.id, buyerInfo.taxId)
    }
    if (
      isStringEmptyOrNull(buyerName) &&
      !isStringEmptyOrNull(buyerInfo.title)
    ) {
      setSublistValue(apDocFields.fields.buyerName.id, buyerInfo.title)
    }
  }

  function isStringEmptyOrNull(value) {
    if (value === 'undefined' || value === undefined) {
      return true
    }
    return !value || value === ''
  }

  function getBuyer(subsidiary) {
    var buyerInfoUrl = url.resolveScript({
      deploymentId: 'customdeploy_gw_sl_business_info_data',
      scriptId: 'customscript_gw_sl_business_info_data',
      params: { subsidiary: subsidiary },
      returnExternalUrl: false
    })
    var buyerInfoResponse = https.get({
      url: buyerInfoUrl
    })
    var responseObject = JSON.parse(buyerInfoResponse.body)
    if (responseObject.code === 200) {
      return responseObject.data
    }
    throw responseObject.errorMessage
  }

  function setSellerCore() {
    var sellerTaxId = getSublistValue(apDocFields.fields.sellerTaxId.id)
    var sellerName = getSublistValue(apDocFields.fields.sellerName.id)
    var seller = getSeller()
    var sellerTaxIdValue = seller.sellerTaxId || seller.tcmSellerTaxId
    var sellerNameValue = seller.sellerName || seller.tcmSellerName
    if (
      isStringEmptyOrNull(sellerTaxId) &&
      !isStringEmptyOrNull(sellerTaxIdValue)
    ) {
      setSublistValue(apDocFields.fields.sellerTaxId.id, sellerTaxIdValue)
    }
    if (
      isStringEmptyOrNull(sellerName) &&
      !isStringEmptyOrNull(sellerNameValue)
    ) {
      setSublistValue(apDocFields.fields.sellerName.id, sellerNameValue)
    }
  }

  function getSeller() {
    var sellerId = currentTransactionRecord.getValue({
      fieldId: 'entity'
    })
    var seller = {}
    var columnMapper = {
      custentity_gw_tax_id_number: 'sellerTaxId',
      custentity_gw_gui_title: 'sellerName'
    }
    Object.keys(columnMapper).forEach(function (columnId) {
      var outputAttr = columnMapper[columnId]
      seller[outputAttr] = ''
    })
    if (sellerId) {
      var sellerInfo = search.lookupFields({
        type: search.Type.VENDOR,
        id: sellerId,
        columns: Object.keys(columnMapper)
      })
      Object.keys(columnMapper).forEach(function (columnId) {
        var outputAttr = columnMapper[columnId]
        seller[outputAttr] = sellerInfo[columnId]
      })
    }
    return seller
  }

  function setCurrencyCore() {
    var defaultCurrencyValue = 'TWD'
    var defaultCurrencyOptionId = apDocCurrencyService.getCurrencyRecordIdByValue(
      defaultCurrencyValue
    )
    var currentCurrencyValue = getSublistValue(apDocFields.fields.currency.id)
    if (!currentCurrencyValue || currentCurrencyValue === 0) {
      setSublistValue(apDocFields.fields.currency.id, defaultCurrencyOptionId)
    }
  }

  function clearDisabledFieldsContentCore(docTypeCode) {
    sublistDisplay.clearDisabledFieldsContent(docTypeCode)
  }

  /**
   * <code>salesAmtChanged</code> event handler
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
   *    {string} The internal ID of the field that was changed.
   * @param [context.lineNum=undefined]
   *    {string} The index of the line if the field is in a sublist or
   *      matrix.
   * @param [context.columnNum=undefined]
   *    {string} The index of the column if the field is in a matrix.
   *
   * @return {void}
   *
   * @static
   * @function documentIssueDateChanged
   */
  function documentIssueDateChanged(context) {
    setDocPeriod()
  }

  var setDocPeriod = setDocPeriodCore

  function setDocPeriodCore() {
    var docIssueDate = getSublistValue(apDocFields.fields.guiDate.id)
    console.log('setDocPeriodCore docIssueDate', docIssueDate)
    var fieldValue = applyPeriodService.convertGuiPeriod(docIssueDate)
    console.log('setDocPeriodCore fieldValue', fieldValue)
    setSublistValue(apDocFields.fields.applyPeriod.id, fieldValue)
  }

  function getFormatCodeById(selectedDocTypeId) {
    var resultObject = search.lookupFields({
      type: 'customrecord_gw_ap_doc_type_option',
      id: selectedDocTypeId,
      columns: ['custrecord_gw_ap_doc_type_value']
    })
    console.log('getFormatCodeById-resultObject', resultObject)

    return resultObject['custrecord_gw_ap_doc_type_value']
  }

  /**
   * <code>salesAmtChanged</code> event handler
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
   *    {string} The internal ID of the field that was changed.
   * @param [context.lineNum=undefined]
   *    {string} The index of the line if the field is in a sublist or
   *      matrix.
   * @param [context.columnNum=undefined]
   *    {string} The index of the column if the field is in a matrix.
   *
   * @return {void}
   *
   * @static
   * @function salesAmtChanged
   */
  function salesAmtChanged(context) {
    var docType = apDocTypeService.getDocTypeCodeByRecordId(getSublistValue(apDocFields.fields.docType.id))
    var guiNumber = getSublistValue(apDocFields.fields.guiNum.id)
    console.log('salesAmtChanged - docType | guiNumber', docType + ' | ' + guiNumber)
    var value = getCurrencySublistFieldValue(context.fieldId)
    var calculatedTaxAmt = docType === '22' && guiNumber !== '' ? 0 : Math.round(value * 0.05)
    setTaxAmt(calculatedTaxAmt)
    var taxAmt = getCurrencySublistFieldValue(apDocFields.fields.taxAmt.id)
    var totalAmt = value + taxAmt
    setTotalAmt(totalAmt)
  }

  /**
   * <code>taxAmtChanged</code> event handler
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
   *    {string} The internal ID of the field that was changed.
   * @param [context.lineNum=undefined]
   *    {string} The index of the line if the field is in a sublist or
   *      matrix.
   * @param [context.columnNum=undefined]
   *    {string} The index of the column if the field is in a matrix.
   *
   * @return {void}
   *
   * @static
   * @function taxAmtChanged
   */
  function taxAmtChanged(context) {
    var value = getCurrencySublistFieldValue(context.fieldId)
    var salesAmt = getCurrencySublistFieldValue(apDocFields.fields.salesAmt.id)
    var totalAmt = value + salesAmt
    setTotalAmt(totalAmt)
  }

  function setTotalAmt(value) {
    setSublistValue(apDocFields.fields.totalAmt.id, value)
  }

  function setTaxAmt(value) {
    setSublistValue(apDocFields.fields.taxAmt.id, value)
  }

  /**
   * <code>ConsolidationMarkChanged</code> event handler
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
   *    {string} The internal ID of the field that was changed.
   * @param [context.lineNum=undefined]
   *    {string} The index of the line if the field is in a sublist or
   *      matrix.
   * @param [context.columnNum=undefined]
   *    {string} The index of the column if the field is in a matrix.
   *
   * @return {void}
   *
   * @static
   * @function ConsolidationMarkChanged
   */
  function consolidationMarkChanged(context) {
    console.log(
      'ConsolidationMarkChanged context.currentRecord',
      context.currentRecord
    )
    sublistDisplay.setCurrentContext(context)
    var value = getSublistValue(apDocFields.fields.consolidationMark.id)
    if (value) {
      var consolMark = apDocConsolidateMarkService.getConsolidateMarkValueByRecordId(
        value
      )
      var docType = getNumberSublistFieldValue(apDocFields.fields.docType.id)
      if (consolMark === 'A') {
        clearTextFieldValue(apDocFields.fields.sellerTaxId.id)
      }
      if (consolMark === 'A' && parseInt(docType) === 22) {
        var commonNumField = getSublistField(apDocFields.fields.commonNumber.id)
        commonNumField.isMandatory = true
      }
    }
  }

  function setConsolidateMarkToA() {
    var consolidateMarkId = apDocConsolidateMarkService.getConsolidateMarkRecordIdByValue(
      'A'
    )
    setSublistValue(apDocFields.fields.consolidationMark.id, consolidateMarkId)
    sublistDisplay.toggleFieldEnabled(
      apDocFields.fields.consolidationMark.id,
      true
    )
  }

  /**
   * <code>TaxTypeChanged</code> event handler
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
   *    {string} The internal ID of the field that was changed.
   * @param [context.lineNum=undefined]
   *    {string} The index of the line if the field is in a sublist or
   *      matrix.
   * @param [context.columnNum=undefined]
   *    {string} The index of the column if the field is in a matrix.
   *
   * @return {void}
   *
   * @static
   * @function TaxTypeChanged
   */
  function taxTypeChanged(context) {
    sublistDisplay.setCurrentContext(context)
    var value = getNumberSublistFieldValue(apDocFields.fields.taxType.id)
    var handleOtherFieldsFunc = []
    handleOtherFieldsFunc.push(handleFieldsForTaxable)
    handleOtherFieldsFunc.push(handleFieldsForTaxExemption)
    handleOtherFieldsFunc.push(handleFieldsForZeroTax)
    handleOtherFieldsFunc.push(handleFieldsForMixTaxOrDefault)
    handleOtherFieldsFunc.forEach(function (handleFunc) {
      handleFunc(context, value)
    })
    // for (var i = 0; i < handleOtherFieldsFunc.length; i++) {
    //   handleOtherFieldsFunc[i](context, value)
    // }
    console.log('TaxTypeChanged value', parseInt(value))
  }

  function handleFieldsForTaxable(context, taxType) {
    if (taxType !== 1) return
    sublistDisplay.toggleFieldEnabled(
      apDocFields.fields.taxExemptedSalesAmt.id,
      false
    )
    setFieldToZero(apDocFields.fields.taxExemptedSalesAmt.id)
    sublistDisplay.toggleFieldEnabled(
      apDocFields.fields.zeroTaxSalesAmt.id,
      false
    )
    setFieldToZero(apDocFields.fields.zeroTaxSalesAmt.id)

    sublistDisplay.toggleFieldEnabled(apDocFields.fields.salesAmt.id, true)
  }

  function handleFieldsForTaxExemption(context, taxType) {
    if (taxType !== 2) return
    setFieldToZero(apDocFields.fields.salesAmt.id)
    setFieldToZero(apDocFields.fields.taxExemptedSalesAmt.id)
    clearTextFieldValue(apDocFields.fields.zeroTaxSalesAmt.id)
    sublistDisplay.toggleFieldEnabled(
      apDocFields.fields.taxExemptedSalesAmt.id,
      false
    )
    sublistDisplay.toggleFieldEnabled(
      apDocFields.fields.zeroTaxSalesAmt.id,
      true
    )
    sublistDisplay.toggleFieldEnabled(apDocFields.fields.salesAmt.id, false)
  }

  function handleFieldsForZeroTax(context, taxType) {
    if (taxType !== 3) return
    setFieldToZero(apDocFields.fields.zeroTaxSalesAmt.id)
    setFieldToZero(apDocFields.fields.salesAmt.id)
    clearTextFieldValue(apDocFields.fields.taxExemptedSalesAmt.id)
    sublistDisplay.toggleFieldEnabled(
      apDocFields.fields.zeroTaxSalesAmt.id,
      false
    )
    sublistDisplay.toggleFieldEnabled(
      apDocFields.fields.taxExemptedSalesAmt.id,
      true
    )
    sublistDisplay.toggleFieldEnabled(apDocFields.fields.salesAmt.id, false)
  }

  function handleFieldsForMixTaxOrDefault(context, taxType) {
    if (taxType !== 4 && taxType !== 0) return
    clearTextFieldValue(apDocFields.fields.zeroTaxSalesAmt.id)
    clearTextFieldValue(apDocFields.fields.taxExemptedSalesAmt.id)
    sublistDisplay.toggleFieldEnabled(
      apDocFields.fields.zeroTaxSalesAmt.id,
      true
    )
    sublistDisplay.toggleFieldEnabled(
      apDocFields.fields.taxExemptedSalesAmt.id,
      true
    )
    sublistDisplay.toggleFieldEnabled(apDocFields.fields.salesAmt.id, true)
  }

  /**
   * <code>applyPeriodChanged</code> event handler
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
   *    {string} The internal ID of the field that was changed.
   * @param [context.lineNum=undefined]
   *    {string} The index of the line if the field is in a sublist or
   *      matrix.
   * @param [context.columnNum=undefined]
   *    {string} The index of the column if the field is in a matrix.
   *
   * @return {void}
   *
   * @static
   * @function salesAmtChanged
   */
  function applyPeriodChanged(context) {
    setApplyPeriod()
  }

  // Common Functions
  function setFieldToZero(fieldId) {
    setSublistValue(fieldId, 0)
  }

  function clearTextFieldValue(fieldId) {
    setSublistValue(fieldId, '')
  }

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
      return value
    }
  }

  function getSublistValue(fieldId) {
    return currentTransactionRecord.getCurrentSublistValue({
      sublistId: apSublistId,
      fieldId: fieldId
    })
  }

  function getSublistField(fieldId) {
    return currentTransactionRecord.getCurrentSublistField({
      sublistId: apSublistId,
      fieldId: fieldId
    })
  }

  function setSublistValue(fieldId, value) {
    currentTransactionRecord.setCurrentSublistValue({
      sublistId: apSublistId,
      fieldId: fieldId,
      value: value
    })
  }

  exports.setCurrentContext = setCurrentContext
  exports.setCurrentRecord = setCurrentRecord
  exports.salesAmtChanged = salesAmtChanged
  exports.taxAmtChanged = taxAmtChanged
  exports.documentTypeChanged = documentTypeChanged
  exports.documentIssueDateChanged = documentIssueDateChanged
  exports.consolidationMarkChanged = consolidationMarkChanged
  exports.taxTypeChanged = taxTypeChanged
  exports.applyPeriodChanged = applyPeriodChanged
  return exports
})
