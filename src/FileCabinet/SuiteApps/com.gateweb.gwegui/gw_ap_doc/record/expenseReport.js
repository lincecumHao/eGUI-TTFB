/**
 *
 * @copyright 2025 GateWeb
 * @author Chesley Lo <chesleylo@gateweb.com.tw>
 *
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define([
    '../../library/ramda.min',
    '../ap_library/gw_ap_lib.js'
], (ramda, apIntegrationUtil) => {
    let exports = {};

    let fieldConfig = {
        employee: {
            internalId: 'entity',
            isHeader: true,
            isLine: false
        },
        date: {
            internalId: 'trandate',
            isHeader: true,
            isLine: false,
            func: (value) => apIntegrationUtil.formatDate(value)
        },
        dueDate: {
            internalId: 'duedate',
            isHeader: true,
            isLine: false,
            func: (value) => apIntegrationUtil.formatDate(value)
        },
        currency: {
            internalId: 'currency',
            isHeader: true,
            isLine: false,
            func: (value) => apIntegrationUtil.getCurrencyIdByCode(value)
        },
        memo: {
            internalId: 'memo',
            isHeader: true,
            isLine: false
        },
        expenseMemo: {
            internalId: 'memo',
            isHeader: false,
            isLine: true
        },
        advance: {
            internalId: 'advance',
            isHeader: true,
            isLine: false
        },
        complete: {
            internalId: 'complete',
            isHeader: true,
            isLine: false
        },
        supervisorApproval: {
            internalId: 'supervisorapproval',
            isHeader: true,
            isLine: false
        },
        accountingApproval: {
            internalId: 'accountingapproval',
            isHeader: true,
            isLine: false
        },
        expenseDate: {
            internalId: 'expensedate',
            isHeader: false,
            isLine: true,
            func: (value) => apIntegrationUtil.formatDate(value)
        },
        expenseAccount: {
            internalId: 'expenseaccount',
            isHeader: false,
            isLine: true,
            func: (value) => apIntegrationUtil.getAccountIdByAccountNumber(value)
        },
        expenseCurrency: {
            internalId: 'currency',
            isHeader: false,
            isLine: true,
            func: (value) => apIntegrationUtil.getCurrencyIdByCode(value)
        },
        taxcode: {
            internalId: 'taxcode',
            isHeader: false,
            isLine: true
        },
        taxAmount: {
            internalId: 'tax1amt',
            isHeader: false,
            isLine: true
        },
        grossAmount: {
            internalId: 'grossamt',
            isHeader: false,
            isLine: true
        },
        expenseAmount: {
            internalId: 'foreignamount',
            isHeader: false,
            isLine: true
        },
        exchangeRate: {
            internalId: 'exchangerate',
            isHeader: true,
            isLine: true
        },
        department: {
            internalId: 'department',
            isHeader: true,
            isLine: true
        },
        class: {
            internalId: 'class',
            isHeader: true,
            isLine: true
        },
        location: {
            internalId: 'location',
            isHeader: true,
            isLine: true
        },
        relatedDocument: {
            internalId: 'custbody_gw_reference_number',
            isHeader: true,
            isLine: false
        },
        expenseCategory: {
            internalId: 'category',
            isHeader: false,
            isLine: true
        },
        subsidiary: {
            internalId: 'subsidiary',
            isHeader: true,
            isLine: false,
            func: (value) => apIntegrationUtil.isCompanyEnableSubsidiary() ? value : null
        }
    };

    exports.fields = fieldConfig;
    exports.allHeaderFields = Object.keys(fieldConfig).filter(function (key) {
        if (fieldConfig[key].isHeader) {
            return key;
        }
    });
    exports.allLineFields = Object.keys(fieldConfig).filter(function (key) {
        if (fieldConfig[key].isLine) {
            return key;
        }
    });

    return exports;
});
