/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define([
  'N/format',
  'N/record',
  'N/runtime',
  'N/search',
  '../vo/gw_ap_doc_fields',
  '../transactionSublist/gw_cs_ap_sublist_display',
  '../transactionSublist/gw_cs_lib_ap_doc_sublist_fields_change',
  '../transactionSublist/gw_cs_lib_ap_doc_sublist_validate_fields',
  '../transactionSublist/gw_cs_trans_ap_doc_sublist',
  '../application/gw_service_ap_doc_type_options',
  '../application/gw_service_ap_doc_status_options',
  '../application/gw_service_ap_doc_tax_type_options',
  '../application/gw_service_ap_doc_deduct_code_options',
  '../application/gw_service_ap_doc_consolidate_mark_options',
  '../application/gw_service_ap_doc_custom_clearance_mark_options',
  '../application/gw_service_ap_doc_exempt_option',
  '../application/gw_service_ap_doc_currency_options',
  '../field_validation/gw_lib_field_validation_gui_number',
], function(
  format,
  record,
  runtime,
  search,
  apDocFields,
  sublistDisplay,
  fieldChangeLib,
  fieldValidationLib,
  apDocSublist,
  apDocTypeService,
  apDocStatusService,
  apDocTaxTypeService,
  apDocDeductCode,
  apDocConsolidateMarkService,
  apDocCustomClearanceMarkService,
  apDocExemptService,
  apDocCurrencyService,
  guiNumberValidator
) {

  function post(requestBody) {
    log.debug('requestBody', requestBody)

    let recordData
    let docFields = getCheckData()
    let allDocType = getAllDocType()

    requestBody.forEach(function(transaction) {
      transaction.isValid = true  //新增並預設為true

      transaction.GUIs.forEach(function(item) {
        addDisplaySetting(docFields, item['docType'], allDocType)
        updateItemObj(item, docFields)
        recordData = getRecordData(item, docFields)
        changeDocTypeToRecordId(item, recordData)
        checkRepeatGui(requestBody, item, recordData)

        validateLine(recordData)

        setResult(transaction, item, recordData)
      })
    })

    return requestBody
  }

  function setResult(transaction, item, recordData) {
    if (transaction.isValid === true) transaction.isValid = (recordData.errorMessage.length === 0)
    item.errorMessage = recordData.errorMessage
  }

  //建立一張驗證基本規則表 ex: 欄位type, 資料格式
  function getCheckData() {
    const isNumber = ['docType', 'salesAmt', 'zeroTaxSalesAmt', 'taxExemptedSalesAmt', 'taxAmt', 'totalAmt', 'consolidationQty']
    const isDate = ['guiDate', 'outputDate', 'applyPeriod', 'applyPeriodSelect']
    let docFields = apDocFields.fields

    apDocFields.fieldNames.forEach(function(fieldName) {
      if (isNumber.indexOf(fieldName) !== -1) {
        docFields[fieldName].isNumber = true
      } else if (isDate.indexOf(fieldName) !== -1) {
        docFields[fieldName].isDate = true
      }
    })

    docFields['docType'].value = getAllDocType()
    docFields['filingSalesTax'].value = [true, false]
    docFields['guiStatus'].value = apDocStatusService.getAllStatus().map(item => item.value)
    docFields['taxType'].value = apDocTaxTypeService.getAllTaxType().map(item => item.value.toString())
    docFields['deductionCode'].value = apDocDeductCode.getAllDeductionCodeOptions().map(item => item.value)
    docFields['consolidationMark'].value = apDocConsolidateMarkService.getAllOptions().map(item => item.value)
    docFields['customClearanceMark'].value = apDocCustomClearanceMarkService.getAllOptions().map(item => item.value)
    docFields['currency'].value = apDocCurrencyService.getAllCurrency().map(item => item.value)
    docFields['zeroTaxMark'].value = apDocExemptService.getAllExempt().map(item => item.value)
    docFields['applyPeriod'].maxLength = 5
    docFields['applyPeriodSelect'].maxLength = 5

    return docFields
  }

  //依docType ex:24,25...來決定欄位的必填與非必填
  function addDisplaySetting(docFields, docType, allDocType) {
    const style = ['mandatoryFields', 'disabledFields']
    let fieldName

    if (allDocType.includes(docType)) {
      Object.keys(docFields).forEach(function(fieldName) {
        docFields[fieldName].display = ''
      })

      style.forEach(function(item) {
        sublistDisplay.formDisplaySettings[docType][item].map(function(field) {
          fieldName = toLowerCaseFirstChar(field.name)
          if (!!docFields[fieldName]) docFields[fieldName].display = item
        })
      })
    }
  }

  function updateItemObj(item, docFields) {
    if (item.consolidationMark === '' && docFields['consolidationMark'].display !== 'disabledFields') {
      item.consolidationMark = 'S'
    }
  }

  function getRecordData(inputData, docFields) {
    let recordData = {}
    let reFieldName = { applyPeriod: 'docIssuePeriod', applyPeriodSelect: 'taxFilingPeriod' }

    recordData['errorMessage'] = []

    Object.keys(docFields).forEach(function(fieldName) {
      let fieldObj = docFields[fieldName]
      let value

      fieldName = (!reFieldName[fieldName]) ? fieldName : reFieldName[fieldName]
      value = inputData[fieldName]

      if (fieldObj.display === 'disabledFields') {
        if (value !== '') {
          recordData['errorMessage'].push(fieldName + '：' + fieldObj.chtName + '不應有值')
        }
      } else {
        if (fieldObj.display === 'mandatoryFields' && value === '') {
          recordData['errorMessage'].push(fieldName + '：' + fieldObj.chtName + '為必填欄位')
        } else if (!!fieldObj.maxLength && fieldObj.maxLength < String(value).length) {
          recordData['errorMessage'].push(fieldName + '：' + fieldObj.chtName + '最大長度為：' + fieldObj.maxLength)
        } else if (!!fieldObj.isNumber && typeof value !== 'number' && value !== '') {
          recordData['errorMessage'].push(fieldName + '：' + fieldObj.chtName + '需為數字')
        } else if (!!fieldObj.isDate && !isValidDate(value)) {
          recordData['errorMessage'].push(fieldName + '：' + fieldObj.chtName + '日期需為' + (value.length > 5 ? 'YYYYMMDD or YYYY-MM-DD' : 'YYYMM'))
        } else if (!!fieldObj.value && !fieldObj.value.includes(value)) {
          recordData['errorMessage'].push(fieldName + '：' + fieldObj.chtName + '需為 ' + fieldObj.value)
        }
      }

      recordData[fieldObj.id] = value
    })

    return recordData
  }

  //使用原網頁畫面上既成的驗證
  function validateLine(recordData) {
    var isValid = true
    var errorObject = {}

    Object.keys(recordData).forEach(function(fieldId) {
      let ignoreFields = ['errorMessage']

      if (ignoreFields.indexOf(fieldId) === -1) {
        let fieldValidationResult = apDocSublist.validateFieldForAPI('', fieldId, recordData)
        isValid = isValid && fieldValidationResult.isValid
        if (!fieldValidationResult.isValid) {
          errorObject[fieldId] = fieldValidationResult.error
        }
      }
    })

    if (!isValid) {
      //log.debug('ErrorMessage, errorObj = ', errorObj)
      getErrorMessage(recordData, errorObject)
    }
  }

  function getErrorMessage(recordData, errorObj) {
    Object.keys(errorObj).forEach(function(fieldId) {
      let fieldObj = apDocFields.getFieldById(fieldId)

      errorObj[fieldId].forEach(function(error) {
        recordData['errorMessage'].push(fieldObj.name + '：' + error.chtMessage)
      })
    })
  }

  function getAllDocType() {
    let allDocType = apDocTypeService.getAllDoctype()
      .filter(item => parseInt(item.value) < 30)
      .map(item => parseInt(item.value))

    return [...new Set(allDocType)].sort()
  }

  function isValidDate(dateString) {
    //將 YYYMM 轉為 YYYYMMDD
    if (dateString.length === 5) dateString = '2' + dateString + '01'

    // 檢查日期格式是否為 YYYYMMDD 或 YYYY-MM-DD
    let regex = /^(?:(\d{4})([-]?)(0[1-9]|1[0-2])\2(0[1-9]|[12]\d|3[01]))$/
    let match = dateString.match(regex)
    if (!match) return false

    let year = parseInt(match[1], 10)
    let month = parseInt(match[3], 10)
    let day = parseInt(match[4], 10)

    // 檢查日期是否有效
    let date = new Date(year, month - 1, day)
    return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day
  }

  function toLowerCaseFirstChar(str) {
    if (!str) return str
    return str.charAt(0).toLowerCase() + str.slice(1)
  }

  //docType找出系統裡相對應的RecordId並替換
  function changeDocTypeToRecordId(item, recordData) {
    let value = item.docType
    let mof = ''
    let recordId = 0
    let guiPeriod = getGuiPeriod(item.guiDate)
      log.debug({ title: 'guiPeriod', details: guiPeriod });

    if (guiNumberValidator.isGuiTrackValidationRequired(value) && item.guiNum !== '') {
      mof = apDocTypeService.getMofValue(guiPeriod, item.docType, item.guiNum.substring(0, 2))
    } else if (item.commonNumber !== '' && value === 22) {
      mof = '02'
    } else {
      mof = '00'
    }

    recordId = apDocTypeService.getApDocTypeIdByValueAndInvoiceCode(value, mof)
    if (recordId === 0) recordData['errorMessage'].unshift( 'docType：憑證格式代號與發票字軌不匹配！')
    item.docTypeId = recordId
    recordData[apDocFields.fields.docType.id] = recordId
  }

  function checkRepeatGui(allData, item, recordData) {
    const ignoreDocType = ['23', '24', '29']

    if (!ignoreDocType.includes(item.docType.toString()) && allData.flatMap(obj => obj.GUIs).filter(gui => gui.guiNum === item.guiNum).length > 1) {
      recordData['errorMessage'].push('guiNum：僅有docType為 23, 24, 29 可以重複發票號碼進行折讓')
    }
  }

  function getGuiPeriod(guiDate) {
    let year = parseInt(guiDate.substring(0, 4)) - 1911
      let month = parseInt(guiDate.substring(5, 7))
      if(guiDate.indexOf('-') === -1) {
          month =  parseInt(guiDate.substring(4, 6))
      }

    if (month % 2 !== 0) {
      month += 1
    }

    month = month < 10 ? `0${month}` : month

    return `${year}${month}`;
  }

  return { post }

})