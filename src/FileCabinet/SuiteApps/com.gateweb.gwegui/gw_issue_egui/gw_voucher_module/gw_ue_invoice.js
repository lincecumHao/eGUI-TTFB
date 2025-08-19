/**
 *
 * @copyright 2023 GateWeb
 * @author Chesley Lo <chesleylo@gateweb.com.tw>
 *
 * @NApiVersion 2.1
 * @NModuleScope Public
 *
 * @NScriptType UserEventScript
 */
define([
    '../gw_dao/gw_transaction_egui_fields',
    'N/search',
    '../../gw_library/gw_lib_transaction_util',
    'N/record',
    '../../library/gw_date_util',
    'N/ui/serverWidget'
], (
    gwTransactionEGUIFields,
    search,
    gwLibTransactionUtil,
    record,
    gwDateUtil,
    serverWidget
) => {

    let exports = {};
    let singleCreateStatusId = null
    let exportSalesStatusId = null

    function isExportSalesInvoice(scriptContext) {
        return scriptContext.newRecord.getValue({fieldId: 'custbody_gw_es_info_completed'})
    }

    function updateFieldsDisplayType(scriptContext) {
        const form = scriptContext.form
        const currentEvidenceIssueStatus = scriptContext.newRecord.getValue({fieldId: 'custbody_gw_evidence_issue_status'})
        if(currentEvidenceIssueStatus) form.getField({id: 'custbody_gw_evidence_issue_status'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE})
        form.getField({id: 'custbody_gw_es_info_completed'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.DISABLED})
    }

    /**
     * Defines the function definition that is executed before record is loaded.
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
     * @param {Form} scriptContext.form - Current form
     * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
     * @since 2015.2
     */
    const beforeLoad = (scriptContext) => {
        try {
            if (gwLibTransactionUtil.isNeedToClearValueForEGUI(scriptContext)) {
                // proceed to set Default value for eGUI
                log.debug({title: 'beforeLoad - clearValueForEGUI', details: 'start'})
                gwLibTransactionUtil.clearValueForEGUI(scriptContext)
                gwLibTransactionUtil.setSourceFieldValue(scriptContext)
            }

            if (scriptContext.type === scriptContext.UserEventType.EDIT && isExportSalesInvoice(scriptContext)) {
                updateFieldsDisplayType(scriptContext)
            }
        } catch (e) {
            log.error({
                title: 'beforeLoad - e',
                details: e
            })
        }

    }

    /**
     * Defines the function definition that is executed before record is submitted.
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
     * @since 2015.2
     */
    const beforeSubmit = (scriptContext) => {
        try {
            if (gwLibTransactionUtil.isNeedToSetDefaultValueForEGUIData(scriptContext)) {
                // proceed to set Default value for eGUI
                log.debug({title: 'beforeSubmit - setDefaultValueForEGUI', details: 'start'})
                gwLibTransactionUtil.setDefaultValueForEGUI(scriptContext)
            }
        } catch (e) {
            log.error({
                title: 'beforeSubmit - error',
                details: e
            })
        }

    }

    function getApplyPeriodByText(voucherApplyPeriodText) {
        const recordType = 'customrecord_gw_apply_period_options'
        let filters = []
        filters.push(['name', 'is', voucherApplyPeriodText])
        let columns = []
        columns.push('name')
        columns.push('internalid')
        var applyPeriodOptionsSearchObj = search.create({
            type: recordType,
            filters,
            columns
        });
        let applyPeriodId = ''
        applyPeriodOptionsSearchObj.run().each(function (result) {
            // .run().each has a limit of 4,000 results
            applyPeriodId = result.id
            return true
        })

        return applyPeriodId
    }

    function getSearchColumn(name, join) {
        if (!name) throw 'error'
        if (name && join) {
            return search.createColumn({name, join})
        } else {
            return search.createColumn({name})
        }
    }


    function getExportedSalesInformationById(invoiceId) {
        let searchResultObj = {}
        let filters = []
        filters.push(['type', 'anyof', 'CustInvc'])
        filters.push('AND')
        filters.push(['internalid', 'anyof', invoiceId])
        filters.push('AND')
        filters.push(['mainline', 'is', 'T'])
        let columns = []
        columns.push(getSearchColumn('tranid'))
        columns.push(getSearchColumn('custbody_gw_applicable_zero_tax'))
        columns.push(getSearchColumn('custrecord_gw_ap_doc_exempt_value', 'CUSTBODY_GW_APPLICABLE_ZERO_TAX'))
        columns.push(getSearchColumn('custbody_gw_customs_export_category'))
        columns.push(getSearchColumn('custrecord_gw_customers_export_cate_id', 'CUSTBODY_GW_CUSTOMS_EXPORT_CATEGORY'))
        columns.push(getSearchColumn('custrecord_gw_customers_export_cate_text', 'CUSTBODY_GW_CUSTOMS_EXPORT_CATEGORY'))
        columns.push(getSearchColumn('custbody_gw_customs_export_date'))
        columns.push(getSearchColumn('custbody_gw_customs_export_no'))
        columns.push(getSearchColumn('custbody_gw_egui_clearance_mark'))
        columns.push(getSearchColumn('custrecord_gw_ap_doc_custom_text', 'CUSTBODY_GW_EGUI_CLEARANCE_MARK'))
        columns.push(getSearchColumn('custrecord_gw_ap_doc_custom_value', 'CUSTBODY_GW_EGUI_CLEARANCE_MARK'))
        columns.push(getSearchColumn('fxamount'))
        columns.push(getSearchColumn('custbody_gw_export_import_customs_area'))
        columns.push(getSearchColumn('custbody_gw_export_transport_customs_a'))
        columns.push(getSearchColumn('custbody_gw_export_year'))
        columns.push(getSearchColumn('custbody_gw_export_case_number'))
        columns.push(getSearchColumn('custbody_gw_export_serial_number'))
        columns.push(getSearchColumn('custbody_gw_gui_sales_amt_tax_zero'))
        var invoiceSearchObj = search.create({
            type: search.Type.INVOICE,
            filters,
            columns
        })
        invoiceSearchObj.run().each(function (result) {
            // .run().each has a limit of 4,000 results
            searchResultObj = JSON.parse(JSON.stringify(result))
            return true
        })

        return searchResultObj
    }

    function getSellerInfoBySubsidiaryId(subsidiary) {
        let sellerInfoObject = {
            sellerTaxId: '',
            sellerName: '',
            sellerAddress: ''
        }
        const recordType = 'customrecord_gw_business_entity'
        let filters = []
        if(subsidiary) {
            filters.push(['custrecord_gw_be_ns_subsidiary', 'is', subsidiary])
            filters.push('OR')
            filters.push(['custrecord_gw_be_ns_id', 'is', subsidiary])
        }

        let columns = []
        columns.push('custrecord_gw_be_tax_id_number')
        columns.push('custrecord_gw_be_gui_title')
        columns.push('custrecord_gw_be_business_address')
        var getSellerInfoSearchObj = search.create({
            type: recordType,
            filters,
            columns
        })
        getSellerInfoSearchObj.run().each(function(result){
            // .run().each has a limit of 4,000 results
            sellerInfoObject.sellerTaxId = result.getValue({name: 'custrecord_gw_be_tax_id_number'})
            sellerInfoObject.sellerName = result.getValue({name: 'custrecord_gw_be_gui_title'})
            sellerInfoObject.sellerAddress = result.getValue({name: 'custrecord_gw_be_business_address'})
            return true
        })

        return sellerInfoObject
    }

    function getExistingVoucherMainRecord(scriptContext) {
        let existingVoucherMainRecordId = null
        const recordType = 'customrecord_gw_voucher_main'
        let filters = []
        filters.push(['custrecord_gw_ns_transaction', 'anyof', scriptContext.newRecord.id])
        let columns = []
        columns.push('name')
        var getExistingVoucherMainRecordSearchObj = search.create({
            type: recordType,
            filters,
            columns
        })
        getExistingVoucherMainRecordSearchObj.run().each(function(result){
            // .run().each has a limit of 4,000 results
            existingVoucherMainRecordId = result.id
            return true
        })

        return existingVoucherMainRecordId
    }

    function getVoucherMainRecordObject(recordId, existingVoucherMainId) {
        log.audit({title: 'getVoucherMainRecordObject - existingVoucherMainId', details: existingVoucherMainId})
        let voucherMainRecordObject = null
        if(existingVoucherMainId) {
            voucherMainRecordObject = record.load({
                type: recordId,
                id: existingVoucherMainId
            })
        } else {
            voucherMainRecordObject = record.create({
                type: recordId
            })
        }
        return voucherMainRecordObject
    }

    function getCustomsExportNumber(invoiceInfoObject) {
        const fieldsValueObject = invoiceInfoObject.values
        const transportCustomsArea = invoiceInfoObject.values.custbody_gw_export_transport_customs_a.length === 2
            ? invoiceInfoObject.values.custbody_gw_export_transport_customs_a : '  '
        return `${fieldsValueObject.custbody_gw_export_import_customs_area}${transportCustomsArea}${fieldsValueObject.custbody_gw_export_year}${fieldsValueObject.custbody_gw_export_case_number}${fieldsValueObject.custbody_gw_export_serial_number}`
    }

    function getExportSalesDocumentNumber(scriptContext) {
        const documentNumberPrefix = 'GWESINV'
        return `${documentNumberPrefix}${scriptContext.newRecord.id}`
    }

    function createOrUpdateExportedSalesVoucherMain(scriptContext) {
        log.audit({title: 'createOrUpdateExportedSalesVoucherMain', details: 'start...'})
        const invoiceInfoObject = getExportedSalesInformationById(scriptContext.newRecord.id)
        log.debug({
            title: 'createOrUpdateExportedSalesVoucherMain - invoiceInfoObject',
            details: invoiceInfoObject
        })
        const recordId = 'customrecord_gw_voucher_main'
        const existingVoucherMainId = getExistingVoucherMainRecord(scriptContext)
        let voucherMainRecordObject = getVoucherMainRecordObject(recordId, existingVoucherMainId)

        voucherMainRecordObject.setValue({
            fieldId: 'name',
            value: getExportSalesDocumentNumber(scriptContext)
        })
        voucherMainRecordObject.setValue({
            fieldId: 'custrecord_gw_voucher_type',
            value: 'EGUI'
        })
        //custrecord_gw_voucher_date - convert date to YYYYMMDD
        voucherMainRecordObject.setValue({
            fieldId: 'custrecord_gw_voucher_date',
            value: gwDateUtil.getDateWithFormat(scriptContext.newRecord.getValue({fieldId: 'trandate'}), 'MM/DD/YYYY', 'YYYYMMDD')
        })
        //custrecord_gw_voucher_yearmonth convert date to 申報期別 text
        const voucherApplyPeriodText = gwDateUtil.getGuiPeriod(scriptContext.newRecord.getValue({fieldId: 'trandate'}))
        voucherMainRecordObject.setValue({
            fieldId: 'custrecord_gw_voucher_yearmonth',
            value: voucherApplyPeriodText
        })

        const subsidiary = scriptContext.newRecord.getValue({fieldId: 'subsidiary'})
        // TODO get seller info by subsidiary id
        const sellerInfoObject = getSellerInfoBySubsidiaryId(subsidiary)
        voucherMainRecordObject.setValue({
            fieldId: 'custrecord_gw_seller',
            value: sellerInfoObject.sellerTaxId
        })
        voucherMainRecordObject.setValue({
            fieldId: 'custrecord_gw_seller_name',
            value: sellerInfoObject.sellerName
        })
        voucherMainRecordObject.setValue({
            fieldId: 'custrecord_gw_seller_address',
            value: sellerInfoObject.sellerAddress
        })

        //custrecord_gw_buyer - INV: 統一編號(id: custbody_gw_tax_id_number)
        voucherMainRecordObject.setValue({
            fieldId: 'custrecord_gw_buyer',
            value: scriptContext.newRecord.getValue({fieldId: 'custbody_gw_tax_id_number'})
        })
        //custrecord_gw_buyer_name - INV 發票抬頭(id: custbody_gw_gui_title)
        voucherMainRecordObject.setValue({
            fieldId: 'custrecord_gw_buyer_name',
            value: scriptContext.newRecord.getValue({fieldId: 'custbody_gw_gui_title'})
        })
        //custrecord_gw_buyer_address - INV 登記地址(id: custbody_gw_gui_address)
        voucherMainRecordObject.setValue({
            fieldId: 'custrecord_gw_buyer_address',
            value: scriptContext.newRecord.getValue({fieldId: 'custbody_gw_gui_address'})
        })
        voucherMainRecordObject.setValue({fieldId: 'custrecord_gw_voucher_format_code', value: '35'})
        //custrecord_gw_clearance_mark - INV: 通關註記(id: custbody_gw_egui_clearance_mark)
        voucherMainRecordObject.setValue({
            fieldId: 'custrecord_gw_clearance_mark',
            value: invoiceInfoObject.values['CUSTBODY_GW_EGUI_CLEARANCE_MARK.custrecord_gw_ap_doc_custom_value']
        })
        voucherMainRecordObject.setValue({fieldId: 'custrecord_gw_voucher_status', value: 'VOUCHER_SUCCESS'})
        voucherMainRecordObject.setValue({fieldId: 'custrecord_gw_voucher_upload_status', value: 'C'})
        voucherMainRecordObject.setValue({fieldId: 'custrecord_gw_tax_type', value: 2})
        voucherMainRecordObject.setValue({fieldId: 'custrecord_gw_tax_rate', value: 0})
        //custrecord_gw_zero_sales_amount - INV total amount (need to convert to TWD)
        voucherMainRecordObject.setValue({
            fieldId: 'custrecord_gw_zero_sales_amount',
            value: invoiceInfoObject.values['custbody_gw_gui_sales_amt_tax_zero']
        })
        //custrecord_gw_total_amount - INV total amount (need to convert to TWD)
        voucherMainRecordObject.setValue({
            fieldId: 'custrecord_gw_total_amount',
            value: invoiceInfoObject.values['custbody_gw_gui_sales_amt_tax_zero']
        })
        //custrecord_voucher_sale_tax_apply_period - need to convert to 申報期別
        voucherMainRecordObject.setValue({
            fieldId: 'custrecord_voucher_sale_tax_apply_period',
            value: getApplyPeriodByText(voucherApplyPeriodText)
        })
        //custrecord_gw_applicable_zero_tax - INV: 適用零稅率規定(id: custbody_gw_applicable_zero_tax)
        voucherMainRecordObject.setValue({
            fieldId: 'custrecord_gw_applicable_zero_tax',
            value: invoiceInfoObject.values['CUSTBODY_GW_APPLICABLE_ZERO_TAX.custrecord_gw_ap_doc_exempt_value']
        })
        //custrecord_gw_customs_export_category - INV: 海關出口報單類別(id: custbody_gw_customs_export_category)
        voucherMainRecordObject.setValue({
            fieldId: 'custrecord_gw_customs_export_category',
            value: invoiceInfoObject.values['CUSTBODY_GW_CUSTOMS_EXPORT_CATEGORY.custrecord_gw_customers_export_cate_id']
        })
        //custrecord_gw_customs_export_no - INV: 海關出口報單號碼(id: custbody_gw_customs_export_no)
        voucherMainRecordObject.setValue({
            fieldId: 'custrecord_gw_customs_export_no',
            // value: invoiceInfoObject.values['custbody_gw_customs_export_no']
            value: getCustomsExportNumber(invoiceInfoObject)
        })
        //custrecord_gw_customs_export_date - INV: 輸出或結匯日期(id: custbody_gw_customs_export_date) - need to convert to YYYMMDD
        voucherMainRecordObject.setValue({
            fieldId: 'custrecord_gw_customs_export_date',
            value: gwDateUtil.getYYYMMDD(scriptContext.newRecord.getValue({fieldId: 'custbody_gw_customs_export_date'}), 'MM/DD/YYYY')
        })
        voucherMainRecordObject.setValue({fieldId: 'custrecord_gw_ns_transaction', value: scriptContext.newRecord.id})
        voucherMainRecordObject.setValue({fieldId: 'custrecord_gw_need_upload_egui_mig', value: 'NONE'})
        const resultId = voucherMainRecordObject.save({ignoreMandatoryFields: true})
        log.debug({title: 'createOrUpdateExportedSalesVoucherMain - resultId', details: resultId})
        if(resultId && !existingVoucherMainId) {
            // TODO write back Export Sales Document Number to invoice
            const submitFieldsObject = {
                custbody_gw_gui_num_start: getExportSalesDocumentNumber(scriptContext),
                custbody_gw_gui_not_upload: true,
                custbody_gw_is_issue_egui: true,
                custbody_gw_lock_transaction: true
            }
            record.submitFields({
                type: record.Type.INVOICE,
                id: scriptContext.newRecord.id,
                values: submitFieldsObject
            })
        }
    }

    function getIssueStatusId() {
        log.audit({title: 'getIssueStatusId', details: 'start...'})
        let filters = []
        let columns = []
        columns.push('custrecord_gw_evidence_status_value')
        columns.push('custrecord_gw_evidence_status_text')
        let getExportSalesEvidenceStatusSearchObj = search.create({
            type: 'customrecord_gw_evidence_status',
            filters,
            columns
        })
        getExportSalesEvidenceStatusSearchObj.run().each(function(result){
            // .run().each has a limit of 4,000 results
            switch (result.getValue({name: 'custrecord_gw_evidence_status_value'})) {
                case 'ES':
                    exportSalesStatusId = result.id
                    break;
                case 'MI':
                    singleCreateStatusId = result.id
            }
            return true
        })
    }

    /**
     * Defines the function definition that is executed after record is submitted.
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
     * @since 2015.2
     */
    const afterSubmit = (scriptContext) => {
        try {
            if (scriptContext.type !== scriptContext.UserEventType.DELETE) {
                getIssueStatusId()
                const esInfoCompleted = scriptContext.newRecord.getValue({fieldId: 'custbody_gw_es_info_completed'})
                const currentEvidenceIssueStatus = scriptContext.newRecord.getValue({fieldId: 'custbody_gw_evidence_issue_status'})
                log.debug({
                    title: 'afterSubmit - date convert',
                    details: {
                        esInfoCompleted,
                        currentEvidenceIssueStatus,
                        tranDate: scriptContext.newRecord.getValue({fieldId: 'trandate'}),
                        getGuiPeriod: gwDateUtil.getGuiPeriod(scriptContext.newRecord.getValue({fieldId: 'trandate'})),
                        getGracePeriod: gwDateUtil.getGracePeriod(scriptContext.newRecord.getValue({fieldId: 'trandate'})),
                        getNsCompatibleDate: gwDateUtil.getNsCompatibleDate(scriptContext.newRecord.getValue({fieldId: 'trandate'})),
                        getCurrentDateTime: gwDateUtil.getCurrentDateTime(),
                        getCurrentDateInYYYYMMDD: gwDateUtil.getCurrentDateInYYYYMMDD(),
                        getDateObject: gwDateUtil.getDateObject(scriptContext.newRecord.getValue({fieldId: 'trandate'})),
                        getDateWithFormat: gwDateUtil.getDateWithFormat(scriptContext.newRecord.getValue({fieldId: 'trandate'}), 'MM/DD/YYYY', 'YYYYMMDD')
                    }
                })
                
                if(esInfoCompleted && currentEvidenceIssueStatus === exportSalesStatusId) {
                    createOrUpdateExportedSalesVoucherMain(scriptContext)
                }
            }
        } catch (e) {
            log.error({title: 'afterSubmit - e', details: e})
        }
    }

    exports.beforeLoad = beforeLoad;
    exports.beforeSubmit = beforeSubmit;
    exports.afterSubmit = afterSubmit;
    return exports;
});
