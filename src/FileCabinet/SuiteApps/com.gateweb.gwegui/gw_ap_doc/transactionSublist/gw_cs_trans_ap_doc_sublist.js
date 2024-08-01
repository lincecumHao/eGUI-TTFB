define([
  'N/ui/message',
  'N/ui/dialog',
  '../vo/gw_ap_doc_fields',
  './gw_cs_ap_sublist_display',
  './gw_cs_lib_ap_doc_sublist_fields_change',
  './gw_cs_lib_ap_doc_sublist_validate_fields'
], function (
  message,
  dialog,
  apDocFields,
  sublistDisplay,
  fieldChangeLib,
  fieldValidationLib
) {
  /**
   * Module Description...
   *
   * @type {Object} module-name
   *
   * @copyright 2020 Gateweb
   * @author Sean Lin <seanlin816@gmail.com>
   *
   * @NApiVersion 2.0
   * @NModuleScope Public

   * @NScriptType ClientScript
   */
  var exports = {}
  var apSublistId = 'recmachcustrecord_gw_apt_doc_tran_id'
  var recordObj = {}

  /**
   * <code>fieldChanged</code> event handler
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
   * @function fieldChanged
   */
  function fieldChanged(context) {
    // console.log('fieldChanged fieldId', context.fieldId)
    var fieldRoute = {}
    fieldRoute[apDocFields.fields.docType.id] =
      fieldChangeLib.documentTypeChanged
    fieldRoute[apDocFields.fields.guiDate.id] =
      fieldChangeLib.documentIssueDateChanged
    fieldRoute[apDocFields.fields.salesAmt.id] = fieldChangeLib.salesAmtChanged
    fieldRoute[apDocFields.fields.taxAmt.id] = fieldChangeLib.taxAmtChanged
    fieldRoute[apDocFields.fields.taxType.id] = fieldChangeLib.taxTypeChanged
    fieldRoute[apDocFields.fields.consolidationMark.id] =
      fieldChangeLib.consolidationMarkChanged
    fieldRoute[apDocFields.fields.applyPeriod.id] =
      fieldChangeLib.applyPeriodChanged
    if (fieldRoute[context.fieldId]) {
      try {
        // fieldChangeLib.setCurrentRecord(context.currentRecord)
        fieldChangeLib.setCurrentContext(context)
        fieldRoute[context.fieldId](context)
      } catch (e) {
        var errorMessage = e.message ? e.message : e
        alert(
          'Field ID: ' +
            context.fieldId +
            ' Error when change value. Message: ' +
            errorMessage
        )
        throw errorMessage
      }
    }
  }

  /**
   * <code>validateField</code> event handler
   *
   * @gov XXX
   *
   * @param context {Object}
   * @param context.currentRecord {record} The current record the user is manipulating in the UI
   * @param context.sublistId {string} The internal ID of the sublist.
   *
   * @param fieldId {string}
   * @param recordObj {Object}
   *
   * @return {{isValid:{boolean}, error:{code:{string}, message: {string}}[]}}
   *
   * @function validateField
   */
  function validateField(context, fieldId, recordObj) {
    // TODO
    // console.log('validateField fieldId', fieldId)
    var fieldRoute = {}
    var resultObj = { isValid: true, error: [] }
    fieldRoute[apDocFields.fields.guiNum.id] =
      fieldValidationLib.validateGuiNumber
    fieldRoute[apDocFields.fields.commonNumber.id] =
      fieldValidationLib.validateCommonNumber
    fieldRoute[apDocFields.fields.buyerTaxId.id] =
      fieldValidationLib.validateBuyerTaxId
    fieldRoute[apDocFields.fields.sellerTaxId.id] =
      fieldValidationLib.validateSellerTaxId
    fieldRoute[apDocFields.fields.taxAmt.id] = fieldValidationLib.validateTaxAmt
    fieldRoute[apDocFields.fields.salesAmt.id] =
      fieldValidationLib.validateSalesAmt
    fieldRoute[apDocFields.fields.zeroTaxSalesAmt.id] =
      fieldValidationLib.validateTaxZeroSalesAmt
    fieldRoute[apDocFields.fields.taxExemptedSalesAmt.id] =
      fieldValidationLib.validateTaxExemptSalesAmt
    fieldRoute[apDocFields.fields.consolidationMark.id] =
      fieldValidationLib.validateConsolidationMark
    fieldRoute[apDocFields.fields.consolidationQty.id] =
      fieldValidationLib.validateConsolidationQty
    fieldRoute[apDocFields.fields.deductionCode.id] =
      fieldValidationLib.validateDeductionCode

    var fieldValue = recordObj[fieldId]
    if (fieldRoute[fieldId] && (fieldValue || fieldValue !== '')) {
      fieldValidationLib.setCurrentContext(context)
      fieldValidationLib.setCurrentSublistApDocRecord(recordObj)
      resultObj = fieldRoute[fieldId](context, recordObj[fieldId])
    }
    // console.log('validateField resultObj', resultObj)
    return resultObj
  }

  /**
   * <code>lineInit</code> event handler
   *
   * @gov XXX
   *
   * @param context {Object}
   * @param context.currentRecord {record} The current record the user is manipulating in the UI
   * @param context.sublistId {string} The internal ID of the sublist.
   *
   * @return {void}
   *
   * @static
   * @function lineInit
   */
  function lineInit(context) {
    // TODO
    // console.log('lineInit sublistId', context.sublistId)
    sublistDisplay.setCurrentContext(context)
    sublistDisplay.resetAllFields()
    fieldChangeLib.setCurrentContext(context)
    var docType = context.currentRecord.getCurrentSublistValue({
      sublistId: context.sublistId,
      fieldId: apDocFields.fields.docType.id
    })
    var taxType = context.currentRecord.getCurrentSublistValue({
      sublistId: context.sublistId,
      fieldId: apDocFields.fields.taxType.id
    })
    var consolidationMark = context.currentRecord.getCurrentSublistValue({
      sublistId: context.sublistId,
      fieldId: apDocFields.fields.consolidationMark.id
    })

    if (docType) {
      fieldChangeLib.documentTypeChanged(context)
    }
    if (taxType) {
      fieldChangeLib.taxTypeChanged(context)
    }
    if (consolidationMark) {
      fieldChangeLib.consolidationMarkChanged(context)
    }
  }

  function getRecordData(context) {
    var recordData = {}
    apDocFields.fieldNames.forEach(function (fieldName) {
      var fieldDefObj = apDocFields.fields[fieldName]
      var value = context.currentRecord.getCurrentSublistValue({
        sublistId: context.sublistId,
        fieldId: fieldDefObj.id
      })
      recordData[fieldDefObj.id] = value
    })
    var internalId =
      context.currentRecord.getCurrentSublistValue({
        sublistId: context.sublistId,
        fieldId: 'id'
      }) || 0
    recordData.id = internalId
    // console.log('internalId', internalId)
    return recordData
  }

  /**
   * <code>validateLine</code> event handler
   *
   * @gov XXX
   *
   * @param context {Object}
   * @param context.currentRecord {record} The current record the user is manipulating in the UI
   * @param context.sublistId {string} The internal ID of the sublist.
   *
   * @return {boolean} <code>true</code> if the line is valid;
   *         <code>false</code> to prevent the line submission.
   *
   * @static
   * @function validateLine
   */
  function validateLine(context) {
    var isValid = true
    var recordData = getRecordData(context)
    var errorObject = {}

    console.log('validateLine-recordData', recordData)
    if(recordData[apDocFields.fields.docType.id] === '') {
      alert('Please enter a value for 憑證格式代號')
      return false
    }

    Object.keys(recordData).forEach(function (fieldId) {
      var ignoreIdFields = ['id']
      if (ignoreIdFields.indexOf(fieldId) === -1) {
        var fieldValidationResult = validateField(context, fieldId, recordData)
        isValid = isValid && fieldValidationResult.isValid
        if (!fieldValidationResult.isValid) {
          errorObject[fieldId] = fieldValidationResult.error
        }
      }
    })
    if (!isValid) {
      showErrorMessage(errorObject)
    }
    console.log('validateLine sublistId', context.sublistId)
    return isValid
  }

  /**
   * <code>showErrorMessage</code> event handler
   *
   * @gov XXX
   *
   * @param errorObj {Object}
   *
   * @function showErrorMessage
   */
  function showErrorMessage(errorObj) {
    var title = '欄位驗證未通過, 請檢查下列欄位:'
    var messageText = ''
    console.log('showErrorMessage, errorObj', errorObj)
    Object.keys(errorObj).forEach(function (fieldId) {
      var fieldObj = apDocFields.getFieldById(fieldId)
      var message = '<p>* ' + fieldObj.chtName + ':</br><ul>'
      errorObj[fieldId].forEach(function (error) {
        message += '<li>' + error.chtMessage + '</li>'
      })
      message = message + '</ul>'
      messageText += message + '</p>'
    })
    var options = {
      title: title,
      message: messageText
    }

    function success(result) {
      console.log('Success with value ' + result)
    }

    function failure(reason) {
      console.log('Failure: ' + reason)
    }

    dialog.alert(options).then(success).catch(failure)
  }

  function sublistFilterWrapper(func) {
    return function () {
      if (arguments[0].sublistId === apSublistId) {
        return func.apply(this, arguments)
      }
      return true
    }
  }

  function needToValidateNumber(context) {
    return context.fieldId === apDocFields.fields.salesAmt.id
        || context.fieldId ===  apDocFields.fields.taxAmt.id
        || context.fieldId ===  apDocFields.fields.totalAmt.id
  }

  function validateFieldAction (context) {
    try {
      var flag = true
      var sublistId = 'recmachcustrecord_gw_apt_doc_tran_id'
      if(context.sublistId === sublistId && needToValidateNumber(context)) {
        var fieldValue = context.currentRecord.getCurrentSublistValue({sublistId, fieldId: context.fieldId})
        if(fieldValue < 0) {
          flag = false
          dialog.alert({
            title: 'Error',
            message: '金額不得小於0'
          })
          context.currentRecord.setCurrentSublistValue({sublistId, fieldId: context.fieldId, value: ''})
        }
      }

      return flag
    } catch (e) {
      console.log('validateFieldAction - e', e)
    }
  }

  exports.fieldChanged = sublistFilterWrapper(fieldChanged)
  exports.lineInit = sublistFilterWrapper(lineInit)
  exports.validateLine = sublistFilterWrapper(validateLine)
  exports.validateField = sublistFilterWrapper(validateFieldAction)
  return exports
})
