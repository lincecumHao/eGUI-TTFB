/**
 *
 * @copyright 2025 GateWeb
 * @author Chesley Lo <chesleylo@gateweb.com.tw>
 *
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define([
    'N/https',
    'N/record',
    'N/search',
    '../../library/gw_date_util',
    '../record/vendorBill',
    '../record/vendorPrepayment',
    '../record/expenseReport'
], (
    https,
    record,
    search,
    dateUtil,
    vendorBill,
    vendorPrepayment,
    expenseReport
) => {
    let exports = {};

    const RECORD_ID_MAPPING = {
        1: 'vendorprepayment',
        2: 'vendorbill',
        3: 'expensereport'
    };

    const INTEGRATION_OPTION = {
        1: 'VALIDATION',
        2: 'VALIDATION_AND_CREATE_VOUCHER_RECORD',
        3: 'VALIDATION_AND_CREATE_TRANSACTION_AND_CREATE_VOUCHER_RECORD',
        4: 'CREATE_TRANSACTION'
    };

    const GUI_OBJECT_PROPERTIES = [
        'docType',
        'guiDate',
        'docIssuePeriod',
        'taxFilingPeriod',
        'filingSalesTax',
        'guiNum',
        'commonNumber',
        'guiStatus',
        'buyerTaxId',
        'buyerName',
        'sellerTaxId',
        'sellerName',
        'taxType',
        'salesAmt',
        'zeroTaxSalesAmt',
        'taxExemptedSalesAmt',
        'taxAmt',
        'totalAmt',
        'deductionCode',
        'consolidationMark',
        'consolidationQty',
        'customClearanceMark',
        'currency',
        'zeroTaxMark',
        'outputDate',
        'businessUnit',
        'relatedNumber',
        'source',
        'uniqueId',
        'buyer'
    ];

    function callApValidation(request) {
        log.audit({ title: 'callApValidation - request', details: request });
        const scriptId = 'customscript_gw_rl_ap_validation';
        const deploymentId = 'customdeploy_gw_rl_ap_validation';
        const headers = {
            'Content-Type': 'application/json'
        };
        return https.requestRestlet({
            scriptId,
            deploymentId,
            method: https.Method.POST,
            headers,
            body: JSON.stringify(request)
        });
    }

    function createTransaction(request) {
        log.audit({ title: 'createTransaction - request', details: request });
        const scriptId = 'customscript_gw_rl_create_ap_transaction';
        const deploymentId = 'customdeploy_gw_rl_create_ap_transaction';
        const headers = {
            'Content-Type': 'application/json'
        };
        return https.requestRestlet({
            scriptId,
            deploymentId,
            method: https.Method.POST,
            headers,
            body: JSON.stringify(request)
        });
    }

    function getCurrencyIdByCode(currencyCode) {
        const type = 'currency';
        let filters = [];
        filters.push(['symbol', 'is', currencyCode]);
        let columns = [];
        columns.push('name');
        const currencySearchObj = search.create({ type, filters, columns });
        let currencyId = null;
        currencySearchObj.run().each(function (result) {
            // .run().each has a limit of 4,000 results
            currencyId = result.id;
            return true;
        });

        log.debug({
            title: 'getCurrencyIdByCode - currencyId',
            details: currencyId
        });

        return currencyId;
    }

    function createVendorPrepayment(transactionObject) {
        log.audit({ title: 'createVendorPrepayment', details: 'start...' });
        let resultObject = {
            isValid: false,
            recordId: null,
            errorMessage: null
        };
        try {
            const recordObject = record.create({
                type: RECORD_ID_MAPPING[transactionObject.Type],
                isDynamic: true
            });

            if (transactionObject.transactions) {
                transactionObject = transactionObject.transactions;
            }

            vendorPrepayment.allFields.forEach(function (prop) {
                let fieldId = vendorPrepayment.fields[prop].internalId;
                let value = transactionObject[prop];
                if (value) {
                    if (prop === 'Date') {
                        value = new Date(
                            dateUtil.getDateWithFormat(
                                value,
                                'YYYY-MM-DD',
                                'YYYY/MM/DD'
                            )
                        );
                    }
                    if (prop === 'Account') {
                        value = getAccountIdByAccountNumber(value);
                    }
                    recordObject.setValue({ fieldId, value });
                }
            });

            resultObject.recordId = recordObject.save({
                ignoreMandatoryFields: true,
                enableSourcing: true
            });
            resultObject.isValid = true;
        } catch (e) {
            resultObject.errorMessage = e.message;
        }

        log.audit({
            title: 'createVendorPrepayment - resultObject',
            details: resultObject
        });

        return resultObject;
        // transactionObject.isValid = resultObject.recordId !== null
        // transactionObject.recordId = resultObject.recordId
        // transactionObject.errorMessage = resultObject.errorMessage
        // return transactionObject;
    }

    function getAccountIdByAccountNumber(accountNumber) {
        const type = 'account';
        let filters = [];
        filters.push(['number', 'is', accountNumber]);
        filters.push('AND');
        filters.push(['isinactive', 'is', 'F']);
        let columns = [];
        columns.push('name');
        columns.push('displayname');
        columns.push('type');
        const accountSearchObj = search.create({ type, filters, columns });
        let accountId = null;
        accountSearchObj.run().each(function (result) {
            // .run().each has a limit of 4,000 results
            log.debug({
                title: 'getAccountIdByAccountNumber - result',
                details: JSON.stringify(result)
            });
            accountId = result.id;
            return true;
        });

        return accountId || accountNumber;
    }

    function createVendorBill(transactionObject) {
        log.audit({ title: 'createVendorBill', details: 'start...' });
        let resultObject = {
            isValid: false,
            recordId: null,
            errorMessage: null
        };
        try {
            let recordObject = null;
            let type = transactionObject.Type;
            if (transactionObject.transactions) {
                transactionObject = transactionObject.transactions;
            }

            if (transactionObject.POID) {
                recordObject = record.transform({
                    fromType: record.Type.PURCHASE_ORDER,
                    fromId: transactionObject.POID,
                    toType: RECORD_ID_MAPPING[type],
                    isDynamic: true
                });
            } else {
                recordObject = record.create({
                    type: RECORD_ID_MAPPING[type],
                    isDynamic: true
                });
            }

            vendorBill.allHeaderFields.forEach(function (prop) {
                let fieldId = vendorBill.fields[prop].internalId;
                let value = transactionObject[prop];
                log.debug({
                    title: 'set header field value',
                    details: {
                        fieldId,
                        value
                    }
                });
                if (value) {
                    if (prop === 'Date' || prop === 'DueDate') {
                        value = new Date(
                            dateUtil.getDateWithFormat(
                                transactionObject[prop],
                                'YYYY-MM-DD',
                                'YYYY/MM/DD'
                            )
                        );
                    }
                    if (
                        (transactionObject[prop] && fieldId !== 'entity') ||
                        (fieldId === 'entity' && !transactionObject.POID)
                    ) {
                        recordObject.setValue({ fieldId, value });
                    }
                }
            });

            if (
                transactionObject.POID &&
                transactionObject.BillItemDetail &&
                transactionObject.BillItemDetail.length > 0
            ) {
                //TODO - update item line
                const itemSublistId = 'item';
                let itemLine = recordObject.getLineCount({
                    sublistId: itemSublistId
                });
                let currentLine = 0;
                log.debug({
                    title: 'createVendorBill - itemLine - before remove',
                    details: recordObject.getLineCount({
                        sublistId: itemSublistId
                    })
                });
                do {
                    recordObject.selectLine({
                        sublistId: itemSublistId,
                        line: currentLine
                    });
                    const itemId = recordObject.getCurrentSublistValue({
                        sublistId: itemSublistId,
                        fieldId: 'item'
                    });
                    const orderLine = recordObject.getCurrentSublistValue({
                        sublistId: itemSublistId,
                        fieldId: 'orderline'
                    });
                    const rate = recordObject.getCurrentSublistValue({
                        sublistId: itemSublistId,
                        fieldId: 'rate'
                    });
                    const amount = recordObject.getCurrentSublistValue({
                        sublistId: itemSublistId,
                        fieldId: 'amount'
                    });
                    log.debug({
                        title: 'createVendorBill - line info',
                        details: {
                            itemId,
                            orderLine,
                            rate,
                            amount
                        }
                    });
                    const matchedItemObject =
                        transactionObject.BillItemDetail.find(function (
                            lineObject
                        ) {
                            return lineObject.LineID == orderLine;
                        });
                    log.debug({
                        title: 'createVendorBill - matchedItemObject',
                        details: matchedItemObject
                    });
                    if (matchedItemObject) {
                        vendorBill.allItemLineFields.forEach(function (prop) {
                            let fieldId = vendorBill.fields[prop].internalId;
                            let value = matchedItemObject[prop];
                            log.debug({
                                title: 'before update item line',
                                details: {
                                    fieldId,
                                    value
                                }
                            });
                            if (value) {
                                log.debug({
                                    title: 'in update item line',
                                    details: {
                                        fieldId,
                                        value
                                    }
                                });
                                recordObject.setCurrentSublistValue({
                                    sublistId: itemSublistId,
                                    fieldId,
                                    value
                                });
                            }
                        });
                        recordObject.commitLine({ sublistId: itemSublistId });
                        currentLine++;
                    } else {
                        recordObject.removeLine({
                            sublistId: itemSublistId,
                            line: currentLine
                        });
                        itemLine--;
                    }
                } while (currentLine < itemLine);
                log.debug({
                    title: 'createVendorBill - itemLine - after remove',
                    details: recordObject.getLineCount({
                        sublistId: itemSublistId
                    })
                });
            }
            if (
                transactionObject.BillExpenseDetail &&
                transactionObject.BillExpenseDetail.length > 0
            ) {
                //TODO - add expense line
                for (
                    let expenseLine = 0;
                    expenseLine < transactionObject.BillExpenseDetail.length;
                    expenseLine++
                ) {
                    const expenseSublistId = 'expense';
                    recordObject.selectNewLine({ sublistId: expenseSublistId });
                    vendorBill.allExpenseLineFields.forEach(function (prop) {
                        let fieldId = vendorBill.fields[prop].internalId;
                        let value =
                            transactionObject.BillExpenseDetail[expenseLine][
                                prop
                            ];
                        log.debug({
                            title: 'adding expense line',
                            details: { fieldId, value }
                        });
                        if (fieldId === 'account' && value) {
                            value = getAccountIdByAccountNumber(value);
                        }
                        if (value) {
                            recordObject.setCurrentSublistValue({
                                sublistId: expenseSublistId,
                                fieldId,
                                value
                            });
                        }
                    });
                    recordObject.commitLine({ sublistId: expenseSublistId });
                }
            }

            resultObject.recordId = recordObject.save({
                ignoreMandatoryFields: true,
                enableSourcing: true
            });
            resultObject.isValid = true;
        } catch (e) {
            resultObject.errorMessage = e.message;
        }

        return resultObject;
        // transactionObject.isValid = resultObject.recordId !== null
        // transactionObject.recordId = resultObject.recordId
        // transactionObject.errorMessage = resultObject.errorMessage
        // return transactionObject;
    }

    function createExpenseReport(transactionObject) {
        log.audit({ title: 'createExpenseReport', details: 'start...' });
        let resultObject = {
            isValid: false,
            recordId: null,
            errorMessage: null
        };
        try {
            const recordObject = record.create({
                type: RECORD_ID_MAPPING[transactionObject.Type],
                isDynamic: true
            });

            if (transactionObject.transactions) {
                transactionObject = transactionObject.transactions;
            }

            expenseReport.allHeaderFields.forEach(function (prop) {
                let fieldId = expenseReport.fields[prop].internalId;
                let value = transactionObject[prop];
                if (value) {
                    if (prop === 'Date' || prop === 'DueDate') {
                        value = new Date(
                            dateUtil.getDateWithFormat(
                                transactionObject[prop],
                                'YYYY-MM-DD',
                                'YYYY/MM/DD'
                            )
                        );
                    }
                    if (prop === 'Currency') {
                        value = getCurrencyIdByCode(transactionObject[prop]);
                    }
                    recordObject.setValue({ fieldId, value });
                }
            });

            if (
                transactionObject.Expenses &&
                transactionObject.Expenses.length > 0
            ) {
                //TODO - add item line
                const expenseSublistId = 'expense';
                for (
                    let expenseLine = 0;
                    expenseLine < transactionObject.Expenses.length;
                    expenseLine++
                ) {
                    recordObject.selectNewLine({ sublistId: expenseSublistId });
                    expenseReport.allLineFields.forEach(function (prop) {
                        let fieldId = expenseReport.fields[prop].internalId;
                        let value =
                            transactionObject.Expenses[expenseLine][prop];
                        if (prop === 'ExpenseDate') {
                            value = new Date(
                                dateUtil.getDateWithFormat(
                                    transactionObject.Expenses[expenseLine][
                                        prop
                                    ],
                                    'YYYY-MM-DD',
                                    'YYYY/MM/DD'
                                )
                            );
                        }
                        if (prop === 'ExpenseCurrency') {
                            value = getCurrencyIdByCode(
                                transactionObject.Expenses[expenseLine][prop]
                            );
                        }
                        if (prop === 'ExpenseAccount') {
                            value = getAccountIdByAccountNumber(value);
                        }
                        if (value) {
                            recordObject.setCurrentSublistValue({
                                sublistId: expenseSublistId,
                                fieldId,
                                value
                            });
                        }
                    });
                    recordObject.commitLine({ sublistId: expenseSublistId });
                }
            }

            resultObject.recordId = recordObject.save({
                ignoreMandatoryFields: true,
                enableSourcing: true
            });
            resultObject.isValid = true;
        } catch (e) {
            resultObject.errorMessage = e.message;
        }

        return resultObject;

        // transactionObject.isValid = resultObject.recordId !== null
        // transactionObject.recordId = resultObject.recordId
        // transactionObject.errorMessage = resultObject.errorMessage
        // return transactionObject;
    }

    function createAccountPayableTransaction(transactionObject) {
        log.audit({
            title: 'before - createAccountPayableTransaction - transactionObject',
            details: transactionObject
        });
        log.audit({
            title: 'before - createAccountPayableTransaction - RECORD_ID_MAPPING[transactionObject.Type]',
            details: RECORD_ID_MAPPING[transactionObject.Type]
        });
        let response = {};
        switch (RECORD_ID_MAPPING[transactionObject.Type]) {
            case record.Type.VENDOR_PREPAYMENT:
                response = createVendorPrepayment(transactionObject);
                break;
            case record.Type.VENDOR_BILL:
                response = createVendorBill(transactionObject);
                break;
            case record.Type.EXPENSE_REPORT:
                response = createExpenseReport(transactionObject);
                break;
        }
        log.audit({
            title: 'after - createAccountPayableTransaction - transactionObject',
            details: transactionObject
        });
        return response;
    }

    function createAccountPayableVoucher(request) {
        log.audit({
            title: 'createAccountPayableVoucher - request',
            details: request
        });
        const scriptId = 'customscript_gw_rl_ap_integration';
        const deploymentId = 'customdeploy_gw_rl_ap_integration';
        const headers = {
            'Content-Type': 'application/json'
        };
        request.forEach(function (eachRequest) {
            let requestArrayObject = [];
            if (eachRequest.isValid) {
                eachRequest.GUIs.forEach(function (eachGUI) {
                    delete eachGUI['docType'];
                    if (eachRequest.recordId)
                        eachGUI['transaction'] = eachRequest.recordId;
                    log.audit({
                        title: 'createAccountPayableVoucher - eachGUI',
                        details: eachGUI
                    });
                    requestArrayObject.push({
                        data: eachGUI
                    });
                });

                const response = https.requestRestlet({
                    scriptId,
                    deploymentId,
                    method: https.Method.POST,
                    headers,
                    body: JSON.stringify(requestArrayObject)
                });

                log.debug({
                    title: 'sendRequest - response.body',
                    details: response.body
                });

                const responseBody = JSON.parse(response.body);
                if (responseBody.length) {
                    responseBody.forEach(function (eachResultObject, index) {
                        if (eachResultObject.status === '1') {
                            eachRequest.GUIs[index].voucherRecordId =
                                eachResultObject.data.internalId;
                        } else {
                            eachRequest.GUIs[index].errorMessage =
                                eachResultObject.errors;
                            eachRequest.isValid = false;
                        }
                    });
                }
            }
        });

        return request;
    }

    function getConsolidatedResultObject(resultArrayObject, integrationOption) {
        log.audit({
            title: 'getConsolidatedResultObject',
            details: 'start...'
        });
        log.audit({
            title: 'getConsolidatedResultObject - resultArrayObject',
            details: resultArrayObject
        });
        let consolidateResultArrayObject = [];
        resultArrayObject.forEach(function (eachObject) {
            let eachResultObject = {
                status: '1',
                isSuccess: eachObject.isValid,
                transactionId: null,
                consolidateResult: [],
                consolidateErrorMessage: [],
                request: eachObject
            };
            if (INTEGRATION_OPTION[integrationOption] === 'VALIDATION') {
                delete eachResultObject['transactionId'];
                delete eachResultObject['consolidateResult'];
            } else if (
                INTEGRATION_OPTION[integrationOption] === 'CREATE_TRANSACTION'
            ) {
                delete eachResultObject['consolidateResult'];
                delete eachResultObject['consolidateErrorMessage'];
            }
            if (eachObject.recordId) {
                if (
                    eachObject.isValid ||
                    INTEGRATION_OPTION[integrationOption] ===
                        'CREATE_TRANSACTION'
                ) {
                    eachResultObject.transactionId = eachObject.recordId;
                } else {
                    // TODO - remove transaction
                    log.audit({
                        title: 'getConsolidatedResultObject - delete transaction',
                        details: 'proceed delete...'
                    });
                    record.delete({
                        type: RECORD_ID_MAPPING[eachObject.Type],
                        id: eachObject.recordId
                    });
                }
            } else {
                eachResultObject.errorMessage = eachObject.errorMessage;
            }
            if (
                eachObject.GUIs &&
                eachObject.GUIs.length > 0 &&
                INTEGRATION_OPTION[integrationOption] !== 'CREATE_TRANSACTION'
            ) {
                eachObject.GUIs.forEach(function (eachGUI) {
                    log.audit({
                        title: 'getConsolidatedResultObject - eachObject',
                        details: eachObject
                    });
                    let eachConsolidatedObject = {
                        guiNumber: eachGUI.guiNum,
                        commonNumber: eachGUI.commonNumber,
                        voucherRecordId: null
                    };
                    if (eachObject.isValid && eachGUI.voucherRecordId) {
                        eachConsolidatedObject.voucherRecordId =
                            eachGUI.voucherRecordId;
                    }
                    if (!eachObject.isValid) {
                        if (
                            eachGUI.errorMessage &&
                            eachGUI.errorMessage.length > 0
                        ) {
                            eachConsolidatedObject.errorMessage =
                                eachGUI.errorMessage;
                        } else if (
                            eachObject.errorMessage &&
                            eachObject.errorMessage.length > 0
                        ) {
                            eachConsolidatedObject.errorMessage =
                                eachObject.errorMessage;
                        }
                        eachResultObject.consolidateErrorMessage.push(
                            eachConsolidatedObject
                        );
                    } else if (
                        INTEGRATION_OPTION[integrationOption] !== 'VALIDATION'
                    ) {
                        eachResultObject.consolidateResult.push(
                            eachConsolidatedObject
                        );
                    }
                });
            }

            log.audit({
                title: 'getConsolidatedResultObject - eachResultObject',
                details: eachResultObject
            });
            log.debug({ title: 'before push 3', details: '...' });
            consolidateResultArrayObject.push(eachResultObject);
        });

        return consolidateResultArrayObject;
    }

    function getSetupOption() {
        const type = 'customrecord_gw_ap_integration_setup';
        let filters = [];
        filters.push(['internalid', 'anyof', 1]);
        let columns = [];
        columns.push('custrecord_gw_ais_option');
        const integrationSetupSearch = search.create({
            type,
            filters,
            columns
        });
        let option = null;
        integrationSetupSearch.run().each(function (result) {
            // .run().each has a limit of 4,000 results
            option = result.getValue({ name: 'custrecord_gw_ais_option' });
            return true;
        });

        return option;
    }

    exports.callApValidation = callApValidation;
    exports.createTransaction = createTransaction;
    exports.createAccountPayableTransaction = createAccountPayableTransaction;
    exports.createAccountPayableVoucher = createAccountPayableVoucher;
    exports.getConsolidatedResultObject = getConsolidatedResultObject;
    exports.getSetupOption = getSetupOption;
    exports.integrationOptionMapping = INTEGRATION_OPTION;
    exports.GUI_OBJECT_PROPERTIES = GUI_OBJECT_PROPERTIES;
    return exports;
});
