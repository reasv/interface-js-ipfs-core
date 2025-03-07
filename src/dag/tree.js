/* eslint-env mocha */
'use strict'

const series = require('async/series')
const eachSeries = require('async/eachSeries')
const dagPB = require('ipld-dag-pb')
const DAGNode = dagPB.DAGNode
const dagCBOR = require('ipld-dag-cbor')
const { spawnNodeWithId } = require('../utils/spawn')
const { getDescribe, getIt, expect } = require('../utils/mocha')

module.exports = (createCommon, options) => {
  const describe = getDescribe(options)
  const it = getIt(options)
  const common = createCommon()

  describe('.dag.tree', () => {
    let ipfs

    before(function (done) {
      // CI takes longer to instantiate the daemon, so we need to increase the
      // timeout for the before step
      this.timeout(60 * 1000)

      common.setup((err, factory) => {
        expect(err).to.not.exist()

        spawnNodeWithId(factory, (err, node) => {
          expect(err).to.not.exist()
          ipfs = node
          done()
        })
      })
    })

    after((done) => common.teardown(done))

    let nodePb
    let nodeCbor
    let cidPb
    let cidCbor

    before(function (done) {
      series([
        (cb) => {
          try {
            nodePb = new DAGNode(Buffer.from('I am inside a Protobuf'))
          } catch (err) {
            return cb(err)
          }

          cb()
        },
        (cb) => {
          dagPB.util.cid(nodePb.serialize())
            .then(cid => {
              cidPb = cid
              cb()
            }, cb)
        },
        (cb) => {
          nodeCbor = {
            someData: 'I am inside a Cbor object',
            pb: cidPb
          }

          dagCBOR.util.cid(dagCBOR.util.serialize(nodeCbor))
            .then(cid => {
              cidCbor = cid
              cb()
            }, cb)
        },
        (cb) => {
          eachSeries([
            { node: nodePb, multicodec: 'dag-pb', hashAlg: 'sha2-256' },
            { node: nodeCbor, multicodec: 'dag-cbor', hashAlg: 'sha2-256' }
          ], (el, cb) => {
            ipfs.dag.put(el.node, {
              format: el.multicodec,
              hashAlg: el.hashAlg
            }, cb)
          }, cb)
        }
      ], done)
    })

    it('should get tree with CID', (done) => {
      ipfs.dag.tree(cidCbor, (err, paths) => {
        expect(err).to.not.exist()
        expect(paths).to.eql([
          'pb',
          'someData'
        ])
        done()
      })
    })

    it('should get tree with CID and path', (done) => {
      ipfs.dag.tree(cidCbor, 'someData', (err, paths) => {
        expect(err).to.not.exist()
        expect(paths).to.eql([])
        done()
      })
    })

    it('should get tree with CID and path as String', (done) => {
      const cidCborStr = cidCbor.toBaseEncodedString()

      ipfs.dag.tree(cidCborStr + '/someData', (err, paths) => {
        expect(err).to.not.exist()
        expect(paths).to.eql([])
        done()
      })
    })

    it('should get tree with CID recursive (accross different formats)', (done) => {
      ipfs.dag.tree(cidCbor, { recursive: true }, (err, paths) => {
        expect(err).to.not.exist()
        expect(paths).to.have.members([
          'pb',
          'someData',
          'pb/Links',
          'pb/Data'
        ])
        done()
      })
    })

    it('should get tree with CID and path recursive', (done) => {
      ipfs.dag.tree(cidCbor, 'pb', { recursive: true }, (err, paths) => {
        expect(err).to.not.exist()
        expect(paths).to.have.members([
          'Links',
          'Data'
        ])
        done()
      })
    })
  })
}
