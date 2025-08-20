define(['N/record', 'N/search', './gw_lib_search', './gw_lib_wrapper'], function (
  record,
  search,
  GwSearch,
  wrapperLib
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

   */
  var exports = {}
  var apDocTypeRecordTypeId = 'customrecord_gw_ap_doc_type_option'

  var allOptions = []

  function constructorWrapper(func) {
    return function () {
      if (allOptions.length === 0) {
        log.debug({ title: 'doc type constructor wrapper get all options' })
        getAllOptions()
      }
      var result = func.apply(this, arguments)
      return result
    }
  }

  function getOptionById(id) {
    var option = allOptions.filter(function (option) {
      return parseInt(option.id) === parseInt(id)
    })[0]
    return option
  }

  function getOptionByValue(value) {
    var option = allOptions.filter(function (option) {
      return option.value.toString() === value.toString()
    })[0]
    return option
  }

  function getAllOptions() {
    var columns = [
      'custrecord_gw_ap_doc_type_value',
      'custrecord_gw_ap_doc_type_text',
      'custrecord_gw_ap_doc_mof_doc_type_code',
    ]
    var result = GwSearch.search(apDocTypeRecordTypeId, columns)
    allOptions = result.map(function (recordObj) {
      return {
        id: recordObj.id,
        value: recordObj['custrecord_gw_ap_doc_type_value'],
        text: recordObj['custrecord_gw_ap_doc_type_text'],
        mofDocType: recordObj['custrecord_gw_ap_doc_mof_doc_type_code'],
      }
    })
    return allOptions
  }

  function getDocTypeCodeByRecordId(id) {
    var option = getOptionById(id)
    return option ? option.value : ''
  }

  function getDocTypeAndMofDocTypeByRecordId(id) {
    var option = getOptionById(id)
    return option
      ? {
          docType: option.value,
          mofDocType: option.mofDocType,
        }
      : null
  }

  function getApDocTypeIdByValueAndInvoiceCode(value, invCode) {
    var results = allOptions.filter(function (option) {
      return (parseInt(option.value) === parseInt(value) && invCode === option.mofDocType)
    })
    if (results && results.length > 0) {
      return results[0].id
    }
    return 0
  }

  function getMofValue(yearMonth, typeCode, invoiceTrack) {
    let mySearch
    let filterArray = []
    let mofValue = ''

    mySearch = search.create({
      type: 'customrecord_gw_assignlog_track',
      columns: [{ name: 'custrecord_gw_track_invoice_type' }]
    })

    filterArray.push(['custrecord_gw_track_year_month', 'is', yearMonth])
    filterArray.push('and')
    filterArray.push(['custrecord_gw_track_type_code', 'is', typeCode])
    filterArray.push('and')
    filterArray.push(['custrecord_gw_track_invoice_track', 'is', invoiceTrack])

    mySearch.filterExpression = filterArray
    mySearch.run().each(function(result) {
      mofValue = result.getValue({ name: 'custrecord_gw_track_invoice_type' })

      return true
    })

    return mofValue
  }

  exports.getDocTypeCodeByRecordId = constructorWrapper(
    getDocTypeCodeByRecordId
  )
  exports.getAllDoctype = getAllOptions
  exports.getDocTypeAndMofDocTypeByRecordId = constructorWrapper(
    getDocTypeAndMofDocTypeByRecordId
  )
  exports.getApDocTypeIdByValueAndInvoiceCode = constructorWrapper(
    getApDocTypeIdByValueAndInvoiceCode
  )
  exports.getMofValue = getMofValue

  return exports
})
