/**
 *
 * @copyright 2023 Gateweb
 * @author Chesley Lo <chesleylo@gateweb.com>
 *
 * @NApiVersion 2.1
 * @NModuleScope Public
 *
 * @NScriptType ClientScript
 *
 */
define(['N/currentRecord', '../vo/gw_ap_doc_fields'], function (currentRecord, gwApDocFields) {

    var exports = {};
    var ACCOUNT_PAYABLE_VOUCHER_SUBLIST_ID = 'recmachcustrecord_gw_apt_doc_tran_id'
    var ACCOUNT_PAYABLE_VOUCHER_SUBLIST_FIELDS = [
        'custrecord_gw_ap_doc_acct_period',
        'custrecord_gw_ap_doc_apply_period',
        'custrecord_gw_ap_doc_buyer_name',
        'custrecord_gw_ap_doc_buyer_tax_id',
        'custrecord_gw_ap_doc_currency',
        'custrecord_gw_ap_doc_deduct_code',
        'custrecord_gw_ap_doc_exempt_amt',
        'custrecord_gw_ap_doc_issue_date',
        'custrecord_gw_ap_doc_sales_amt',
        'custrecord_gw_ap_doc_source',
        'custrecord_gw_ap_doc_status',
        'custrecord_gw_ap_doc_tax_amt',
        'custrecord_gw_ap_doc_tax_type',
        'custrecord_gw_ap_doc_total_amt',
        'custrecord_gw_ap_doc_type',
        'custrecord_gw_ap_doc_ztr_amt',
        'custrecord_gw_apt_doc_tran_id',
        'custrecord_gw_ap_doc_seller_tax_id',
        'custrecord_gw_ap_doc_seller_name'
    ]
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {
        console.log('pageInit', scriptContext.currentRecord.id)
    }

    function copyLastLine(currentRecordObj, lastLineIndex) {
        currentRecordObj.selectNewLine({
            sublistId: ACCOUNT_PAYABLE_VOUCHER_SUBLIST_ID
        })

        ACCOUNT_PAYABLE_VOUCHER_SUBLIST_FIELDS.forEach(function (eachField) {
            var fieldValue = currentRecordObj.getSublistValue({
                sublistId: ACCOUNT_PAYABLE_VOUCHER_SUBLIST_ID,
                fieldId: eachField,
                line: lastLineIndex
            })
            console.log('copyLastLine - fieldValue', fieldValue)
            currentRecordObj.setCurrentSublistValue({
                sublistId: ACCOUNT_PAYABLE_VOUCHER_SUBLIST_ID,
                fieldId: eachField,
                value: fieldValue,
            })
        })
    }

    function makeCopyVoucherLine() {
        var currentRecordObj = currentRecord.get()
        var accountPayableVoucherLineCount = currentRecordObj.getLineCount({
            sublistId: ACCOUNT_PAYABLE_VOUCHER_SUBLIST_ID
        })
        console.log('makeCopyVoucherLine - accountPayableVoucherLineCount', accountPayableVoucherLineCount)
        if(accountPayableVoucherLineCount) {
            var lastLineIndex = accountPayableVoucherLineCount - 1
            copyLastLine(currentRecordObj, lastLineIndex)
        }
    }

    exports.pageInit = pageInit
    exports.makeCopyVoucherLine = makeCopyVoucherLine

    return exports
});
