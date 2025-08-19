/**
 *
 * @copyright 2025 GateWeb
 * @author Chesley Lo <chesleylo@gateweb.com.tw>
 *
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['../../library/ramda.min', '../ap_library/gw_ap_lib.js'], (ramda, apIntegrationUtil) => {
    let exports = {};

    let fieldConfig = {
        subsidiary: {
            internalId: 'subsidiary',
            isHeader: true,
            isItemLine: false,
            isExpenseLine: false,
            func: (value) => {
                return apIntegrationUtil.isCompanyEnableSubsidiary() ? value : null;
            }
        },
        entity: {
            internalId: 'entity',
            isHeader: true,
            isItemLine: false,
            isExpenseLine: false,
            func: (value, requestObj) => {
                return requestObj.poid ? null : value;
            }
        },
        account: {
            internalId: 'account',
            isHeader: false,
            isItemLine: false,
            isExpenseLine: true,
            func: apIntegrationUtil.getAccountIdByAccountNumber
        },
        date: {
            internalId: 'trandate',
            isHeader: true,
            isItemLine: false,
            isExpenseLine: false,
            func: apIntegrationUtil.formatDate
        },
        dueDate: {
            internalId: 'duedate',
            isHeader: true,
            isItemLine: false,
            isExpenseLine: false,
            func: apIntegrationUtil.formatDate
        },
        memo: {
            internalId: 'memo',
            isHeader: true,
            isItemLine: true,
            isExpenseLine: true,
            func: (value, requestObj) => {
                return requestObj.poid ? null : value;
            }
        },
        location: {
            internalId: 'location',
            isHeader: true,
            isItemLine: true,
            isExpenseLine: true,
            func: (value, requestObj) => {
                return requestObj.poid ? null : value;
            }
        },
        itemCode: {
            internalId: 'item',
            isHeader: false,
            isItemLine: true,
            isExpenseLine: false,
            func: (value, requestObj) => {
                return requestObj.poid ? null : value;
            }
        },
        quantity: {
            internalId: 'quantity',
            isHeader: false,
            isItemLine: true,
            isExpenseLine: false
        },
        taxcode: {
            internalId: 'taxcode',
            isHeader: false,
            isItemLine: true,
            isExpenseLine: true
        },
        rate: {
            internalId: 'rate',
            isHeader: false,
            isItemLine: true,
            isExpenseLine: true,
            func: (value, requestObj) => {
                return requestObj.poid ? null : value;
            }
        },
        amount: {
            internalId: 'amount',
            isHeader: false,
            isItemLine: true,
            isExpenseLine: true,
            func: (value, requestObj) => {
                return requestObj.poid ? null : value;
            }
        },
        taxAmount: {
            internalId: 'tax1amt',
            isHeader: false,
            isItemLine: true,
            isExpenseLine: true,
            func: (value, requestObj) => {
                return requestObj.poid ? null : value;
            }
        },
        grossAmount: {
            internalId: 'grossamt',
            isHeader: false,
            isItemLine: true,
            isExpenseLine: true,
            func: (value, requestObj) => {
                return requestObj.poid ? null : value;
            }
        },
        department: {
            internalId: 'department',
            isHeader: true,
            isItemLine: true,
            isExpenseLine: true,
            func: (value, requestObj) => {
                return requestObj.poid ? null : value;
            }
        },
        class: {
            internalId: 'class',
            isHeader: true,
            isItemLine: true,
            isExpenseLine: true,
            func: (value, requestObj) => {
                return requestObj.poid ? null : value;
            }
        },
        relatedDocument: {
            internalId: 'custbody_gw_reference_number',
            isHeader: true,
            isItemLine: false,
            isExpenseLine: false
        },
        tranid: {
            internalId: 'tranid',
            isHeader: true,
            isItemLine: false,
            isExpenseLine: false
        }
    };

    exports.fields = fieldConfig;
    exports.allHeaderFields = Object.keys(fieldConfig).filter((key) => {
        if (fieldConfig[key].isHeader) {
            return key;
        }
    });
    exports.allItemLineFields = Object.keys(fieldConfig).filter(function (key) {
        if (fieldConfig[key].isItemLine) {
            return key;
        }
    });
    exports.allExpenseLineFields = Object.keys(fieldConfig).filter(function (key) {
        if (fieldConfig[key].isExpenseLine) {
            return key;
        }
    });

    return exports;
});
