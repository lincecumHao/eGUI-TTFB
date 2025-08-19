define(['../library/ramda.min'], function (ramda) {
  /**
   * Module Description...
   *
   * @type {Object} module-name
   *
   * @copyright 2022 Gateweb
   * @author Sean Lin <seanlin@gateweb.com.tw>
   *
   * @NApiVersion 2.1
   * @NModuleScope Public

   */
  var exports = {}
  var fields = {
    docTypeId: {
      name: 'docTypeId',
      toField: 'custrecord_gw_ap_doc_type',
      dataType: 'string'
    },
    guiNum: {
      name: 'guiNum',
      toField: 'custrecord_gw_ap_doc_gui_num',
      dataType: 'string'
    },
    commonNumber: {
      name: 'commonNumber',
      toField: 'custrecord_gw_ap_doc_comm_num',
      dataType: 'string'
    },
    guiStatus: {
      name: 'guiStatus',
      toField: 'custrecord_gw_ap_doc_status',
      dataType: 'string'
    },
    guiDate: {
      name: 'guiDate',
      toField: 'custrecord_gw_ap_doc_issue_date',
      dataType: 'date'
    },
    buyer: {
      name: 'buyer',
      toField: 'custrecord_gw_ap_doc_buyer',
      dataType: 'string'
    },
    buyerTaxId: {
      name: 'buyerTaxId',
      toField: 'custrecord_gw_ap_doc_buyer_tax_id',
      dataType: 'string'
    },
    buyerName: {
      name: 'buyerName',
      toField: 'custrecord_gw_ap_doc_buyer_name',
      dataType: 'string'
    },
    sellerTaxId: {
      name: 'sellerTaxId',
      toField: 'custrecord_gw_ap_doc_seller_tax_id',
      dataType: 'string'
    },
    sellerName: {
      name: 'sellerName',
      toField: 'custrecord_gw_ap_doc_seller_name',
      dataType: 'string'
    },
    salesAmt: {
      name: 'salesAmt',
      toField: 'custrecord_gw_ap_doc_sales_amt',
      dataType: 'int'
    },
    taxAmt: {
      name: 'taxAmt',
      toField: 'custrecord_gw_ap_doc_tax_amt',
      dataType: 'int'
    },
    totalAmt: {
      name: 'totalAmt',
      toField: 'custrecord_gw_ap_doc_total_amt',
      dataType: 'int'
    },
    taxType: {
      name: 'taxType',
      toField: 'custrecord_gw_ap_doc_tax_type',
      dataType: 'string'
    },
    taxExemptedSalesAmt: {
      name: 'taxExemptedSalesAmt',
      toField: 'custrecord_gw_ap_doc_exempt_amt',
      dataType: 'int'
    },
    zeroTaxSalesAmt: {
      name: 'zeroTaxSalesAmt',
      toField: 'custrecord_gw_ap_doc_ztr_amt',
      dataType: 'int'
    },
    deductionCode: {
      name: 'deductionCode',
      toField: 'custrecord_gw_ap_doc_deduct_code',
      dataType: 'string'
    },
    consolidationMark: {
      name: 'consolidationMark',
      toField: 'custrecord_gw_ap_doc_co_mark',
      dataType: 'string'
    },
    consolidationQty: {
      name: 'consolidationQty',
      toField: 'custrecord_gw_ap_doc_co_qty',
      dataType: 'int'
    },
    customClearanceMark: {
      name: 'customClearanceMark',
      toField: 'custrecord_gw_ap_doc_custom_mark',
      dataType: 'string'
    },
    currency: {
      name: 'currency',
      toField: 'custrecord_gw_ap_doc_currency',
      dataType: 'string'
    },
    zeroTaxMark: {
      name: 'zeroTaxMark',
      toField: 'custrecord_gw_ap_doc_zero_tax_mark',
      dataType: 'string'
    },
    outputDate: {
      name: 'outputDate',
      toField: 'custrecord_gw_ap_doc_close_date',
      dataType: 'date'
    },
    businessUnit: {
      name: 'businessUnit',
      toField: 'custrecord_gw_ap_doc_business_unit',
      dataType: 'string'
    },
    relatedNumber: {
      name: 'relatedNumber',
      toField: 'custrecord_gw_ap_doc_related_number',
      dataType: 'string'
    },
    docIssuePeriod: {
      name: 'docIssuePeriod',
      toField: 'custrecord_gw_ap_doc_acct_period',
      dataType: 'string'
    },
    source: {
      name: 'source',
      toField: 'custrecord_gw_ap_doc_source',
      dataType: 'string'
    },
    uniqueId: {
      name: 'uniqueId',
      toField: 'custrecord_gw_ap_doc_unique_id',
      dataType: 'string'
    },
    transaction: {
      name: 'transaction',
      toField: 'custrecord_gw_apt_doc_tran_id',
      dataType: 'string'
    },
    taxFilingPeriod: {
      name: 'taxFilingPeriod',
      toField: 'custrecord_gw_ap_doc_apply_period',
      dataType: 'string'
    },
      taxFilingMonth: {
          name: 'taxFilingMonth',
          toField: 'custrecord_gw_ap_doc_apply_month',
          dataType: 'list'
      },
    filingSalesTax: {
      name: 'filingSalesTax',
      toField: 'custrecord_gw_ap_doc_apply',
      dataType: 'bool'
    }
  }

  function getFieldById(internalId) {
    var fieldKey = Object.keys(fields).filter(function (fieldName) {
      return fields[fieldName].toField === internalId
    })[0]

    if (fieldKey) return fields[fieldKey]
    return null
  }

  var outputMapping = (fieldConfig) => {
    return ramda.reduce(
      function (result, fieldId) {
        result[fieldId] = fieldConfig[fieldId].toField
        return result
      },
      {},
      Object.keys(fieldConfig)
    )
  }

  var fieldTypes = {}
  exports.fieldOutputMapping = outputMapping(fields)
  exports.fields = fields
  exports.fieldNames = Object.keys(fields)
  exports.getFieldById = getFieldById
  return exports
})
