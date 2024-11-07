define(['N/currentRecord', 'N/search'], function (currentRecord, search) {
  /**
   * @NApiVersion 2.1
   * @NScriptType ClientScript
   * @NModuleScope Public
   */
  var exports = {}

  var _current_record = currentRecord.get()

  function postSourcing(context) {
    try {
      alert('postSourcing=')
      loadEGUIListToDeductionList(context.currentRecord)
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  function loadEGUIListToDeductionList(current_record) {
    try {
      var _lock_transaction = current_record.getValue({
        fieldId: 'custbody_gw_lock_transaction',
      })
      if (_lock_transaction == true) {
        //load
        var _internalId = current_record.id
        var _eGuiAry = loadEGUIList(_internalId)

        var _eGuiList = ''
        for (var i = 0; i < _eGuiAry.length; i++) {
          var _number = _eGuiAry[i]
          if (_eGuiList.length != 0) {
            _eGuiList += ',' + _eGuiList
          } else {
            _eGuiList = _number
          }
        }

        current_record.setValue({
          fieldId: 'custbody_gw_creditmemo_deduction_list',
          value: _eGuiList,
          ignoreFieldChange: true,
          forceSyncSourcing: true,
        })
      }
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  function loadEGUIList(internalId) {
    var _eGuiAry = []
    var _record_id = 'customrecord_gw_voucher_details'
    if (internalId != 0) {
      try {
        var _mySearch = search.create({
          type: _record_id,
          columns: [
            search.createColumn({ name: 'custrecord_gw_original_gui_date' }),
            search.createColumn({ name: 'custrecord_gw_original_gui_number' }),
          ],
        })

        var _filterArray = []
        _filterArray.push([
          'custrecord_gw_ns_document_type',
          search.Operator.IS,
          'CREDITMEMO',
        ])
        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_ns_document_apply_id',
          search.Operator.IS,
          internalId,
        ])
        _mySearch.filterExpression = _filterArray
        var _pagedData = _mySearch.runPaged({
          pageSize: 1000,
        })
        for (var i = 0; i < _pagedData.pageRanges.length; i++) {
          var _currentPage = _pagedData.fetch(i)

          _currentPage.data.forEach(function (result) {
            var _result = JSON.parse(JSON.stringify(result))

            var _original_gui_date =
              _result.values.custrecord_gw_original_gui_date
            var _original_gui_number =
              _result.values.custrecord_gw_original_gui_number

            _eGuiAry.push(_original_gui_number)
          })
        }
      } catch (e) {
        console.log(e.name + ':' + e.message)
      }
    }

    return _eGuiAry
  }

  exports.postSourcing = postSourcing
  return exports
})
