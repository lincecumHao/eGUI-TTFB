define([
  '../vo/gw_ap_doc_fields',
  './gw_cs_lib_ap_doc_pageInit',
  './gw_cs_lib_ap_doc_fields_change',
], function (ApDocFields, PageInitLib, bodyFieldChangeLib) {
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
    var modeRoute = {}
    modeRoute['copy'] = PageInitLib.uiCopyInit
    modeRoute['create'] = PageInitLib.uiCreateInit
    modeRoute['edit'] = PageInitLib.uiEditInit
    try {
      modeRoute[context.mode](context)
    } catch (e) {
      onPageInitError({ context: context, error: e })
    }
  }

  /**
   * <code>validateField</code> event handler
   *
   * @gov XXX
   *
   * @param context
   *    {Object}
   * @param context.currentRecord
   *    {record} The current record the user is manipulating in the UI
   * @param context.sublistId
   *    {string} The internal ID of the sublist.
   * @param context.fieldId
   *    {string} The internal ID of the field being validated.
   * @param [context.lineNum=undefined]
   *    {string} The index of the line if the field is in a sublist or
   *      matrix.
   * @param [context.columnNum=undefined]
   *    {string} The index of the column if the field is in a matrix.
   *
   * @return {boolean} <code>true</code> if the field is valid.
   *         <code>false</code> to prevent the field value from changing.
   *
   * @static
   * @function validateField
   */
  function validateField(context) {
    // TODO
    console.log('validateField')
    return true
  }

  /**
   * <code>fieldChanged</code> event handler
   *
   * @gov XXX
   *
   * @param context
   *    {Object}
   * @param context.currentRecord
   *    {record} The current record the user is manipulating in the UI
   * @param context.sublistId
   *    {string} The internal ID of the sublist.
   * @param context.fieldId
   *    {string} The internal ID of the field that was changed.
   * @param [context.lineNum=undefined]
   *    {string} The index of the line if the field is in a sublist or
   *      matrix.
   * @param [context.columnNum=undefined]
   *    {string} The index of the column if the field is in a matrix.
   *
   * @return {void}
   *
   * @static
   * @function fieldChanged
   */
  function fieldChanged(context) {
    // TODO
    var fieldLocRoute = {}
    fieldLocRoute['body'] = bodyFieldsChange
    fieldLocRoute['sublist'] = sublistFieldChange
    var fieldLoc = context.sublistId ? 'sublist' : 'body'
    try {
      fieldLocRoute[fieldLoc](context)
    } catch (e) {
      onFieldChangeError({ context: context, error: e })
    }
  }

  function bodyFieldsChange(context) {
    var fieldRoute = {}
    fieldRoute[ApDocFields.fields.docType.id] =
      bodyFieldChangeLib.documentTypeChanged
    fieldRoute[ApDocFields.fields.salesAmt.id] =
      bodyFieldChangeLib.salesAmtChanged
    fieldRoute[ApDocFields.fields.taxAmt.id] = bodyFieldChangeLib.taxAmtChanged
    fieldRoute[ApDocFields.fields.taxType.id] =
      bodyFieldChangeLib.taxTypeChanged
    fieldRoute[ApDocFields.fields.consolidationMark.id] =
      bodyFieldChangeLib.consolidationMarkChanged
    if (fieldRoute[context.fieldId]) {
      try {
        bodyFieldChangeLib.setCurrentContext(context)
        fieldRoute[context.fieldId](context)
      } catch (e) {
        alert('Exception: ' + e.message)
        throw e
      }
    }
  }

  function sublistFieldChange(context) {}

  /**
   * <code>postSourcing</code> event handler
   *
   * @gov XXX
   *
   * @param context
   *    {Object}
   * @param context.currentRecord
   *    {record} The current record the user is manipulating in the UI
   * @param context.sublistId
   *    {string} The internal ID of the sublist.
   * @param context.fieldId
   *    {string} The internal ID of the field that triggered
   *            <code>postSourcing</code>.
   *
   * @return {void}
   *
   * @static
   * @function postSourcing
   */
  function postSourcing(context) {
    // TODO
  }

  /**
   * <code>lineInit</code> event handler
   *
   * @gov XXX
   *
   * @param context
   *    {Object}
   * @param context.currentRecord
   *    {record} The current record the user is manipulating in the UI
   * @param context.sublistId
   *    {string} The internal ID of the sublist.
   *
   * @return {void}
   *
   * @static
   * @function lineInit
   */
  function lineInit(context) {
    // TODO
  }

  /**
   * <code>validateLine</code> event handler
   *
   * @gov XXX
   *
   * @param context
   *    {Object}
   * @param context.currentRecord
   *    {record} The current record the user is manipulating in the UI
   * @param context.sublistId
   *    {string} The internal ID of the sublist.
   *
   * @return {boolean} <code>true</code> if the line is valid;
   *         <code>false</code> to prevent the line submission.
   *
   * @static
   * @function validateLine
   */
  function validateLine(context) {
    // TODO
    return true
  }

  /**
   * <code>validateInsert</code> event handler
   *
   * @gov XXX
   *
   * @param context
   *    {Object}
   * @param context.currentRecord
   *    {record} The current record the user is manipulating in the UI
   * @param context.sublistId
   *    {string} The internal ID of the sublist.
   *
   * @return {boolean} <code>true</code> if the line can be inserted;
   *         <code>false</code> to prevent the line insertion.
   *
   * @static
   * @function validateInsert
   */
  function validateInsert(context) {
    // TODO
    return true
  }

  /**
   * <code>validateDelete</code> event handler
   *
   * @gov XXX
   *
   * @param context
   *    {Object}
   * @param context.currentRecord
   *    {record} The current record the user is manipulating in the UI
   * @param context.sublistId
   *    {string} The internal ID of the sublist.
   *
   * @return {boolean} <code>true</code> if the line can be removed;
   *         <code>false</code> to prevent the line removal.
   *
   * @static
   * @function validateDelete
   */
  function validateDelete(context) {
    // TODO
    return true
  }

  /**
   * <code>sublistChanged</code> event handler
   *
   * @gov XXX
   *
   * @param context
   *    {Object}
   * @param context.currentRecord
   *    {record} The current record the user is manipulating in the UI
   * @param context.sublistId
   *    {string} The internal ID of the sublist.
   *
   * @return {void}
   *
   * @static
   * @function sublistChanged
   */
  function sublistChanged(context) {
    // TODO
  }

  /**
   * <code>saveRecord</code> event handler
   *
   * @gov XXX
   *
   * @param context {Object}
   * @param context.currentRecord {CurrentRecord} The record in context
   * @return {boolean} <code>true</code> if the record is valid;
   *         <code>false</code> to stop form submission.
   *
   * @static
   * @function saveRecord
   */
  function saveRecord(context) {
    // TODO
    var currentRecord = context.currentRecord
    var field = currentRecord.getField({
      fieldId: 'custrecord_gw_ap_doc_gui_num',
    })
    var value = currentRecord.getValue({
      fieldId: 'custrecord_gw_ap_doc_gui_num',
    })
    console.log('field is mandatory', field.isMandatory)
    console.log('field value', value)
    var hasValue = value ? value.trim() !== '' : false
    var isValid = field.isMandatory ? hasValue : true
    console.log('isValid', isValid)
    return isValid
  }

  /**
   * Error handler for Client Script
   *
   * @gov XXX
   *
   * @param {Object} params
   * @param {Error} params.error - The error which triggered this handler
   * @param {Object} params.context
   * @param params.context.mode
   *    {string} The access mode of the current record. Will be one of
   *            <ul>
   *            <li>copy</li>
   *            <li>create</li>
   *            <li>edit</li>
   *            </ul>
   * @param params.context.currentRecord {CurrentRecord} The record in context
   *
   */
  function onPageInitError(params) {
    // TODO
    alert('Page Init Error Occurs')
    log.debug({ title: 'Page Init Error Occurs', details: params.error })
  }

  function onFieldChangeError(params) {
    // TODO
    alert('Field Change Error Occurs: error: ' + params.error)
    log.debug({ title: 'Field Change Error Occurs', details: params.error })
  }

  exports.pageInit = pageInit
  exports.validateField = validateField
  exports.fieldChanged = fieldChanged
  exports.postSourcing = postSourcing
  exports.lineInit = lineInit
  exports.validateLine = validateLine
  exports.validateInsert = validateInsert
  exports.validateDelete = validateDelete
  exports.sublistChanged = sublistChanged
  exports.saveRecord = saveRecord
  return exports
})
