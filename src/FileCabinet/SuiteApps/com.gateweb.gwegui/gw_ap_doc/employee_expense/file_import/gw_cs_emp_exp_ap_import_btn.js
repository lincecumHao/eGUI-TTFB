define(['N/url'], function (url) {
  /**
   * Module Description...
   *
   * @type {Object} module-name
   *
   * @copyright 2020 Gateweb
   * @author Sean Lin <seanlin816@gmail.com>
   *
   * @NApiVersion 2.1
   * @NModuleScope Public

   * @NScriptType ClientScript
   */
  var exports = {}

  /**
   * <code>pageInit</code> event handler
   *
   * @gov XXX
   *
   * @param context
   *    {Object}
   * @param context.mode
   *    {string} The access mode of the current record. Will be one of
   *            <ul>
   *            <li>copy</li>
   *            <li>create</li>
   *            <li>edit</li>
   *            </ul>
   * @param context.currentRecord {CurrentRecord} The record in context
   *
   * @return {void}
   *
   * @static
   * @function pageInit
   */
  function pageInit(context) {
    // TODO
    console.log('pageInit current record id', context.currentRecord.id)
  }

  function apDocImportBtnClicked(transactionType, transactionId) {
    // alert('apDocImportBtnClicked, transaction Id : ' + transactionId)
    var importUrl = url.resolveScript({
      scriptId: 'customscript_gw_sl_ap_import',
      deploymentId: 'customdeploy_gw_sl_ap_import',
      returnExternalUrl: false,
      params: {
        transaction_type: transactionType,
        transaction_id: transactionId
      }
    })
    window.location = importUrl
  }

  exports.pageInit = pageInit
  exports.apDocImportBtnClicked = apDocImportBtnClicked
  return exports
})
