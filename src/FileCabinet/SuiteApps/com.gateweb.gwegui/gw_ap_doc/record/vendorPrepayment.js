/**
 *
 * @copyright 2025 GateWeb
 * @author Chesley Lo <chesleylo@gateweb.com.tw>
 *
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define([
  '../../library/gw_date_util.js',
    '../ap_library/gw_ap_lib.js'
], (
  dateUtil,
  apIntegrationUtil
) => {

    let exports = {};

    let fieldConfig = {
      subsidiary: {
        internalid: 'subsidiary',
        func: (value) => {
          return apIntegrationUtil.isCompanyEnableSubsidiary() ? value : null
        }
      },
      entity: {
        internalId: 'entity'
      },
      poid: {
        internalId: 'purchaseorder'
      },
      account: {
        internalId: 'account',
        func: apIntegrationUtil.getAccountIdByAccountNumber
      },
      exchangeRate: {
        internalId: 'exchangerate'
      },
      date: {
        internalId: 'trandate',
        func: apIntegrationUtil.formatDate
      },
      amount: {
        internalId: 'payment'
      },
      memo: {
        internalId: 'memo'
      },
      location: {
        internalId: 'location'
      },
      department: {
        internalId: 'department'
      },
      class: {
        internalId: 'class'
      },
      relatedDocument: {
        internalId: 'custbody_gw_reference_number'
      },
      taxFilingMonth: {
        internalId: 'custrecord_gw_ap_doc_apply_month'
      },
        approvalStatus: {
            internalId: 'approvalstatus',
        }
    }

    exports.fields = fieldConfig
    exports.allFields = Object.keys(fieldConfig);

    return exports
})
