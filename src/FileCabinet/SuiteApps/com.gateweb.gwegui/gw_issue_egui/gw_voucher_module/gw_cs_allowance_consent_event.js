/**
 *
 * @copyright 2023 Gateweb
 * @author Chesley Lo <chesleylo@gateweb.com>
 *
 * @NApiVersion 2.1
 * @NModuleScope Public
 *
 * @NScriptType ClientScript
 */
define([
    'N/record',
    'N/ui/dialog',
    // '../services/gw_allowance_consent_notification'
], function (
    record,
    dialog,
    // gwAllowanceConsentNotification
) {
    var currentRecord = null;

    function pageInit(scriptContext) {
        currentRecord = scriptContext.currentRecord;
    }

    function convertDateToString(newUploadDate) {
        var month = newUploadDate.split('/')[0].length === 1 ? `0${newUploadDate.split('/')[0]}` : newUploadDate.split('/')[0];
        var day = newUploadDate.split('/')[1].length === 1 ? `0${newUploadDate.split('/')[1]}` : newUploadDate.split('/')[1];
        var year = newUploadDate.split('/')[2];
        return `${year}${month}${day}`;
    }

    function updateAllowanceConsentNotificationRecord(recordInfoObject) {
        var recordObject = record.load({
            type: 'customrecord_gw_allowance_consent_notify',
            id: recordInfoObject.recordId
        });
        if(recordInfoObject.buyerAgree) {
            recordObject.setValue({
                fieldId: 'custrecord_buyer_agree',
                value: true
            });
            recordObject.setValue({
                fieldId: 'custrecord_new_voucher_date',
                value: recordInfoObject.convertedNewUploadDate
            });
        } else if (recordInfoObject.buyerReject) {
            recordObject.setValue({
                fieldId: 'custrecord_buyer_reject',
                value: true
            });
            recordObject.setValue({
                fieldId: 'custrecord_reject_reason',
                value: recordInfoObject.disagreeReason
            });
        }

        recordObject.save();
    }

    function handleAgree() {
        var newUploadDate = currentRecord.getText({fieldId: 'custpage_new_upload_date'});
        // var applyPeriod = currentRecord.getValue({fieldId: 'custpage_apply_period'});
        console.log('newUploadDate', newUploadDate);
        // console.log('applyPeriod', applyPeriod);
        var convertedNewUploadDate = convertDateToString(newUploadDate);
        var recordId = getRecordId();
        // TODO - Update Allowance Consent Notification Record
        var recordInfoObject = {
            recordId: recordId,
            buyerAgree: true,
            convertedNewUploadDate: convertedNewUploadDate
        };
        updateAllowanceConsentNotificationRecord(recordInfoObject)
        // TODO - Update Voucher Main Record

        // TODO - Send Notification - need to do it in UE
        // gwAllowanceConsentNotification.executeScript(recordId, false, 'send_buyer_agree_to_seller');
        dialog.alert({
            title: '成功',
            message: '開立完成後, 系統會以信件通知'
        }).then(reloadPage);
    }

    function getDisagreeReason() {
        return currentRecord.getValue({fieldId: 'custpage_disagree_reason'});
    }

    function getRecordId() {
        return currentRecord.getValue({fieldId: 'custpage_record_id'});
    }

    function handleDisagree() {
        var disagreeReason = getDisagreeReason();
        if (disagreeReason.length === 0) {
            dialog.alert({
                title: '錯誤',
                message: '請填不同意原因'
            });
        } else {
            var recordId = getRecordId();
            // TODO - Update Allowance Consent Notification Record
            var recordInfoObject = {
                recordId: recordId,
                buyerReject: true,
                disagreeReason: disagreeReason
            };
            updateAllowanceConsentNotificationRecord(recordInfoObject)
            // record.submitFields({
            //     type: 'customrecord_gw_allowance_consent_notify',
            //     id: recordId,
            //     values: {
            //         custrecord_reject_reason: disagreeReason,
            //         custrecord_buyer_reject: true
            //     }
            // });
            // TODO - Send Notification - need to do it in UE
            // gwAllowanceConsentNotification.executeScript(recordId, false, 'send_buyer_reject_to_seller');
            // TODO - close
            dialog.alert({
                title: '成功',
                message: '憑證已取消'
            }).then(reloadPage);
        }
    }

    function reloadPage() {
        let currentPath = window.location.href;
        window.onbeforeunload = null;
        window.location.assign(currentPath);
    }

    return {
        pageInit: pageInit,
        handleAgree: handleAgree,
        handleDisagree: handleDisagree
    };

});
