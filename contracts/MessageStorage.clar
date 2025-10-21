(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-CONTENT u101)
(define-constant ERR-INVALID-HASH u102)
(define-constant ERR-INVALID-CHANNEL-ID u103)
(define-constant ERR-INVALID-TIMESTAMP u104)
(define-constant ERR-INVALID-GEO-LAT u105)
(define-constant ERR-INVALID-GEO-LONG u106)
(define-constant ERR-INVALID-MEDIA-REF u107)
(define-constant ERR-MESSAGE-ALREADY-EXISTS u108)
(define-constant ERR-CHANNEL-NOT-FOUND u109)
(define-constant ERR-MAX-MESSAGES-EXCEEDED u110)
(define-constant ERR-INVALID-SENDER u111)
(define-constant ERR-INVALID-STATUS u112)
(define-constant ERR-INVALID-PRIORITY u113)
(define-constant ERR-INVALID-EXPIRY u114)
(define-constant ERR-INVALID-SIGNATURE u115)
(define-constant ERR-AUTHORITY-NOT-VERIFIED u116)
(define-constant ERR-INVALID-UPDATE-PARAM u117)
(define-constant ERR-UPDATE-NOT-ALLOWED u118)
(define-constant ERR-INVALID-MESSAGE-TYPE u119)
(define-constant ERR-INVALID-LANGUAGE u120)

(define-data-var next-message-id uint u0)
(define-data-var max-messages-per-channel uint u10000)
(define-data-var storage-fee uint u10)
(define-data-var authority-contract (optional principal) none)

(define-map messages
  uint
  {
    content: (string-utf8 500),
    hash: (buff 32),
    sender: principal,
    timestamp: uint,
    channel-id: uint,
    geo-lat: (optional int),
    geo-long: (optional int),
    media-ref: (optional (string-ascii 256)),
    status: bool,
    priority: uint,
    expiry: (optional uint),
    signature: (optional (buff 65)),
    message-type: (string-ascii 20),
    language: (string-ascii 10)
  }
)

(define-map messages-by-hash
  (buff 32)
  uint
)

(define-map messages-by-channel
  uint
  (list 10000 uint)
)

(define-map message-updates
  uint
  {
    update-status: bool,
    update-priority: uint,
    update-timestamp: uint,
    updater: principal
  }
)

(define-read-only (get-message (id uint))
  (map-get? messages id)
)

(define-read-only (get-message-updates (id uint))
  (map-get? message-updates id)
)

(define-read-only (get-messages-for-channel (channel-id uint))
  (default-to (list) (map-get? messages-by-channel channel-id))
)

(define-read-only (is-message-exists (hash (buff 32)))
  (is-some (map-get? messages-by-hash hash))
)

(define-private (validate-content (content (string-utf8 500)))
  (if (and (> (len content) u0) (<= (len content) u500))
      (ok true)
      (err ERR-INVALID-CONTENT))
)

(define-private (validate-hash (hash (buff 32)))
  (if (is-eq (len hash) u32)
      (ok true)
      (err ERR-INVALID-HASH))
)

(define-private (validate-channel-id (channel-id uint))
  (if (> channel-id u0)
      (ok true)
      (err ERR-INVALID-CHANNEL-ID))
)

(define-private (validate-geo-lat (lat (optional int)))
  (match lat value
    (if (and (>= value -90000000) (<= value 90000000))
        (ok true)
        (err ERR-INVALID-GEO-LAT))
    (ok true))
)

(define-private (validate-geo-long (long (optional int)))
  (match long value
    (if (and (>= value -180000000) (<= value 180000000))
        (ok true)
        (err ERR-INVALID-GEO-LONG))
    (ok true))
)

(define-private (validate-media-ref (ref (optional (string-ascii 256))))
  (match ref value
    (if (<= (len value) u256)
        (ok true)
        (err ERR-INVALID-MEDIA-REF))
    (ok true))
)

(define-private (validate-priority (priority uint))
  (if (<= priority u10)
      (ok true)
      (err ERR-INVALID-PRIORITY))
)

(define-private (validate-expiry (expiry (optional uint)))
  (match expiry value
    (if (> value block-height)
        (ok true)
        (err ERR-INVALID-EXPIRY))
    (ok true))
)

(define-private (validate-signature (sig (optional (buff 65))))
  (match sig value
    (if (is-eq (len value) u65)
        (ok true)
        (err ERR-INVALID-SIGNATURE))
    (ok true))
)

(define-private (validate-message-type (typ (string-ascii 20)))
  (if (or (is-eq typ "text") (is-eq typ "alert") (is-eq typ "update"))
      (ok true)
      (err ERR-INVALID-MESSAGE-TYPE))
)

(define-private (validate-language (lang (string-ascii 10)))
  (if (and (> (len lang) u0) (<= (len lang) u10))
      (ok true)
      (err ERR-INVALID-LANGUAGE))
)

(define-private (validate-sender (sender principal))
  (if (not (is-eq sender 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-INVALID-SENDER))
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (try! (validate-sender contract-principal))
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-messages-per-channel (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set max-messages-per-channel new-max)
    (ok true)
  )
)

(define-public (set-storage-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set storage-fee new-fee)
    (ok true)
  )
)

(define-public (submit-message
  (content (string-utf8 500))
  (hash (buff 32))
  (channel-id uint)
  (geo-lat (optional int))
  (geo-long (optional int))
  (media-ref (optional (string-ascii 256)))
  (priority uint)
  (expiry (optional uint))
  (signature (optional (buff 65)))
  (message-type (string-ascii 20))
  (language (string-ascii 10))
)
  (let (
        (next-id (var-get next-message-id))
        (current-max (var-get max-messages-per-channel))
        (authority (var-get authority-contract))
        (channel-messages (get-messages-for-channel channel-id))
      )
    (asserts! (< (len channel-messages) current-max) (err ERR-MAX-MESSAGES-EXCEEDED))
    (try! (validate-content content))
    (try! (validate-hash hash))
    (try! (validate-channel-id channel-id))
    (try! (validate-geo-lat geo-lat))
    (try! (validate-geo-long geo-long))
    (try! (validate-media-ref media-ref))
    (try! (validate-priority priority))
    (try! (validate-expiry expiry))
    (try! (validate-signature signature))
    (try! (validate-message-type message-type))
    (try! (validate-language language))
    (asserts! (not (is-message-exists hash)) (err ERR-MESSAGE-ALREADY-EXISTS))
    (let ((authority-recipient (unwrap! authority (err ERR-AUTHORITY-NOT-VERIFIED))))
      (try! (stx-transfer? (var-get storage-fee) tx-sender authority-recipient))
    )
    (map-set messages next-id
      {
        content: content,
        hash: hash,
        sender: tx-sender,
        timestamp: block-height,
        channel-id: channel-id,
        geo-lat: geo-lat,
        geo-long: geo-long,
        media-ref: media-ref,
        status: true,
        priority: priority,
        expiry: expiry,
        signature: signature,
        message-type: message-type,
        language: language
      }
    )
    (map-set messages-by-hash hash next-id)
    (map-set messages-by-channel channel-id (append channel-messages next-id))
    (var-set next-message-id (+ next-id u1))
    (print { event: "message-submitted", id: next-id })
    (ok next-id)
  )
)

(define-public (update-message
  (message-id uint)
  (update-status bool)
  (update-priority uint)
)
  (let ((message (map-get? messages message-id)))
    (match message
      m
        (begin
          (asserts! (is-eq (get sender m) tx-sender) (err ERR-NOT-AUTHORIZED))
          (try! (validate-priority update-priority))
          (map-set messages message-id
            (merge m {
              status: update-status,
              priority: update-priority,
              timestamp: block-height
            })
          )
          (map-set message-updates message-id
            {
              update-status: update-status,
              update-priority: update-priority,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "message-updated", id: message-id })
          (ok true)
        )
      (err ERR_GROUP-NOT-FOUND)
    )
  )
)

(define-public (get-message-count)
  (ok (var-get next-message-id))
)

(define-public (check-message-existence (hash (buff 32)))
  (ok (is-message-exists hash))
)