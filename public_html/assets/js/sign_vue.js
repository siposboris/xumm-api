if (typeof payload !== 'undefined') {
  Vue.component('VueJsonPretty', VueJsonPretty.default)

  var WebSocketConnection

  var $ = new Vue({
    el: '#sign_vdom',
    data: function () {
      return {
        state: {
          WebSocketConnectTimeout: null
        },
        messages: [],
        showTx: false,
        opened: false,
        expired: false,
        expirationTimestamp: 0,
        resolved: false,
        rejected: false,
        returnUrl: null,
        payload: payload,
        options: options,
        message: '',
        rawTxDom: null
      }
    },
    watch: {
      'opened': function () {
        if (typeof window.parseRelativeTime !== 'undefined') {
          Vue.nextTick(function () {
            window.parseRelativeTime()
          })
        }
      },
      'returnUrl': function () {
        setTimeout(function () {
          document.location.href = $.returnUrl
        }, 5 * 1000)
      }
    },
    methods: {
      showRawTx: function () {
        swal({ content: this.rawTxDom, buttons: {} })
      },
      expire: function () {
        if (options.returnUrl !== '') {
          this.returnUrl = options.returnUrl
        }
        this.expired = true
        this.resolved = true
        this.rejected = true
      },
      receiveWebSocketMessage: function (message) {
        console.log('> Got WS data', message)
        message.message = JSON.parse(message.data)
        if (Object.keys(message.message).indexOf('expired') > -1) {
          this.expire()
        }
        if (Object.keys(message.message).indexOf('expires_in_seconds') > -1) {
          if (this.expirationTimestamp === 0) {
            var expirationInterval
            this.expirationTimestamp = (new Date() / 1000) + message.message.expires_in_seconds
            expirationInterval = setInterval(() => {
              if ((new Date() / 1000) >= this.expirationTimestamp) {
                this.expire()
                clearInterval(expirationInterval)
              }
            }, 2000)
          }
        }
        if (Object.keys(message.message).indexOf('expired') > -1) {
          this.expire()
        }
        if (Object.keys(message.message).indexOf('opened') > -1) {
          this.opened = true
        }
        if (Object.keys(message.message).indexOf('signed') > -1) {
          this.resolved = true
          if (!message.message.signed) {
            this.rejected = true
          }
          if (Object.keys(message.message).indexOf('return_url') > -1) {
            if (Object.keys(message.message.return_url).indexOf('web') > -1) {
              if (message.message.return_url.web !== null) {
                this.returnUrl = message.message.return_url.web
              }
            }
          }
        }
        this.messages.push(message)
        this.message = ''
      },
      sendWebSocketMessage: function (message) {
        WebSocketConnection.send(JSON.stringify({
          message: $.message
        }))
      },
      reconnectWebSocket: function () {
        this.state.WebSocketConnectTimeout = setTimeout(function () {
          $.connectWebSocket()
        }, 2000)
      },
      connectWebSocket: function () {
        clearTimeout(this.state.WebSocketConnectTimeout)

        if (WebSocketConnection !== undefined) {
          WebSocketConnection.close()
        }

        WebSocketConnection = new WebSocket(document.location.href.replace(/^http([s]*)/g, 'ws$1').replace(/\/qr$/g, '').split('#')[0])

        WebSocketConnection.onmessage = function (event) {
          var len = event.data.size === undefined ? event.data.length : event.data.size
          $.receiveWebSocketMessage({
            length: len,
            data: event.data
          })
        }
        WebSocketConnection.onopen = function (evt) {
          console.log('WS Connected')
        }
        WebSocketConnection.onclose = function (evt) {
          console.log('WS Closed, reconnecting...')
          $.reconnectWebSocket()
        }
        WebSocketConnection.onerror = function (evt) {
          console.log('WS Error, reconnecting...')
          $.reconnectWebSocket()
        }
      }
    },
    mounted: function () {
      this.rawTxDom = document.querySelector('#showTx')
    },
    created: function () {
      this.connectWebSocket()
    }
  })
} /* typeof payload !== undefined */
