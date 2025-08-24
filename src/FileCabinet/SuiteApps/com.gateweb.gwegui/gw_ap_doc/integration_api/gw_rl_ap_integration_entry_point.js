/**
 *
 * @copyright 2025 GateWeb
 * @author Chesley Lo <chesleylo@gateweb.com.tw>
 *
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define([
    './gw_lib_ap_integration',
    '../../ap-integration/infrastructure/gw_vo_response',
    'N/error',
    'N/search'
], (
    gwLibApIntegration,
    RestletResponse,
    error,
    search
) => {

    let exports = {};

    function isValidRequest(req, integrationOption){
        log.audit({title: 'in isValidRequest', details: 'start...'})
        let isRequestParamsValid = true

        if(req && req.length > 0) {
            for (let transactionIndex = 0 ; transactionIndex < req.length; transactionIndex++) {
                let eachObj = req[transactionIndex]
                log.debug({title: 'isValidRequest - eachObj', details: eachObj})
                if(integrationOption === 4) {
                    isRequestParamsValid = true
                    break
                }
                const hasGUI = 'GUIs' in eachObj
                log.debug({title: 'isValidRequest - hasGUI', details: hasGUI})
                if(hasGUI && eachObj.GUIs.length > 0) {
                    for (let index = 0; index < eachObj.GUIs.length; index++) {
                        log.debug({title: 'isValidRequest - each GUI object', details: eachObj.GUIs[index]})
                        for(let propIndex = 0; propIndex < gwLibApIntegration.GUI_OBJECT_PROPERTIES.length; propIndex++) {
                            const prop = gwLibApIntegration.GUI_OBJECT_PROPERTIES[propIndex]
                            if(!(prop in eachObj.GUIs[index]) || eachObj.GUIs[index][prop] === null) {
                                log.error({
                                    title: 'isValidRequest - prop info',
                                    details: {
                                        prop: prop,
                                        value: eachObj.GUIs[index][prop],
                                        hasProp: prop in eachObj.GUIs[index]
                                    }
                                })
                                isRequestParamsValid = false
                                break
                            }
                        }
                    }
                } else {
                    isRequestParamsValid = false
                    break
                }
            }
        } else {
            isRequestParamsValid = false
        }

        log.audit({title: 'isValidRequest - isRequestParamsValid', details: isRequestParamsValid})
        return isRequestParamsValid
    }

    function isTrxValid(reqArray) {
        let isValid = true;
        let transactionArray = [];
        reqArray.forEach(function (requestObj) {
            requestObj?.GUIs.forEach(function (guiObj) {
                if (guiObj?.transaction) {
                    transactionArray.push(guiObj.transaction);
                } else {
                    isValid = false;
                }
            });
        });
        if (!isValid) return isValid;


        transactionArray = [...new Set(transactionArray)];
        const transactionSearchObj = search.create({
            type: 'transaction',
            filters: [
                ['mainline', 'is', 'T'],
                'AND',
                ['internalid', 'anyof'].concat(transactionArray),
                'AND',
                ['type', 'anyof', 'ExpRept', 'VPrep', 'VendBill']
            ],
            columns: ['internalid']
        });
        const searchResultCount = transactionSearchObj.runPaged().count;
        return searchResultCount === transactionArray.length;
    }

    function post(request) {
        log.audit({title: 'post - request', details: request})

        //TODO - get integration setup
        let {option: integrationOption, isTrxNeeded} = gwLibApIntegration.getSetupOption()
        if (!integrationOption) {
            const integrationError = error.create({
                name: 'INVALID_INTEGRATION_OPTION',
                message: 'Integration option is invalid',
                notifyOff: false
            })
            throw {name: integrationError.name, message: integrationError.message}
        }
        log.debug({title: 'request[0].action', details: request[0].action})
        if (request[0].action && request[0].action === 'validation') {
            integrationOption = 1 // default to validation
        } else if (request[0].action && request[0].action === 'createTransaction') {
            integrationOption = 4 // default to create transaction
        } else if (request[0].action === 'validation&CreateVoucher') {
            integrationOption = 2 // default to validation & create voucher record
        }
        //TODO - validate request params
        const requestObj = typeof request === 'string' ? JSON.parse(request) : request // Array Objects
        if (!isValidRequest(requestObj, integrationOption)) {
            const validateRequestError = error.create({
                name: 'INVALID_REQUEST',
                message: 'The request parameters is invalid',
                notifyOff: false
            })
            throw {name: validateRequestError.name, message: validateRequestError.message}
        }
        log.debug({title: 'isTrxNeeded', details: {isTrxNeeded, integrationOption, isTrxValid: isTrxValid(requestObj)}});
        if (isTrxNeeded && integrationOption === 2 && !isTrxValid(requestObj)) {
            const validateRequestError = error.create({
                name: 'INVALID_REQUEST',
                message: 'The [transaction] parameters is invalid',
                notifyOff: false
            })
            throw {name: validateRequestError.name, message: validateRequestError.message}
        }

        let validationResponse = null
        let createTransactionResponse = null
        let createAccountPayableVoucherResponse = null
        let returnObject = null

        switch (gwLibApIntegration.integrationOptionMapping[integrationOption]) {
            case 'VALIDATION':
                log.debug({title: 'in VALIDATION', details: 'start...'})
                //TODO - validation - call validation Restlet
                validationResponse = gwLibApIntegration.callApValidation(request)
                log.debug({title: 'post - validateResult', details: validationResponse})
                returnObject = gwLibApIntegration.getConsolidatedResultObject(JSON.parse(validationResponse.body), integrationOption)
                break;
            case 'VALIDATION_AND_CREATE_TRANSACTION_AND_CREATE_VOUCHER_RECORD':
                log.debug({
                    title: 'in VALIDATION_AND_CREATE_TRANSACTION_AND_CREATE_VOUCHER_RECORD',
                    details: 'start...'
                })
                //TODO - validation & create transaction & create voucher record
                validationResponse = gwLibApIntegration.callApValidation(request)
                //TODO - call create transaction Restlet
                createTransactionResponse = gwLibApIntegration.createTransaction(JSON.parse(validationResponse.body))
                //TODO - call create ap doc record Restlet
                createAccountPayableVoucherResponse = gwLibApIntegration.createAccountPayableVoucher(JSON.parse(createTransactionResponse.body))
                returnObject = gwLibApIntegration.getConsolidatedResultObject(createAccountPayableVoucherResponse, integrationOption)
                break;
            case 'VALIDATION_AND_CREATE_VOUCHER_RECORD':
                log.debug({title: 'in VALIDATION_AND_CREATE_VOUCHER_RECORD', details: 'start...'})
                //TODO - validation & create voucher record
                validationResponse = gwLibApIntegration.callApValidation(request)
                //TODO - call create ap doc record Restlet
                createAccountPayableVoucherResponse = gwLibApIntegration.createAccountPayableVoucher(JSON.parse(validationResponse.body))
                returnObject = gwLibApIntegration.getConsolidatedResultObject(createAccountPayableVoucherResponse, integrationOption)
                break;
            case 'CREATE_TRANSACTION':
                log.debug({
                    title: 'in CREATE_TRANSACTION',
                    details: 'start...'
                })
                createTransactionResponse = gwLibApIntegration.createTransaction(request)
                returnObject = gwLibApIntegration.getConsolidatedResultObject(JSON.parse(createTransactionResponse.body), integrationOption)
                break;
        }

        const failedRequest = returnObject.find(function (eachObject) {
            return !eachObject.isSuccess
        })
        log.audit({title: 'failedRequest', details: failedRequest})
        if (failedRequest) {
            let consolidateError = null
            if(integrationOption === 4) {
                 consolidateError = error.create({
                    name: 'FAILURE',
                    message: failedRequest.errorMessage,
                    notifyOff: false
                })
            } else {
                 consolidateError = error.create({
                    name: 'FAILURE',
                    message: JSON.stringify(failedRequest.consolidateErrorMessage),
                    notifyOff: false
                })
            }
            throw {name: consolidateError.name, message: consolidateError.message}
        }

        return JSON.stringify(returnObject)
    }

    exports.post = post
    return exports
});
