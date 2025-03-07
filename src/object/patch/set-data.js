/* eslint-env mocha */
/* eslint-disable max-nested-callbacks */
'use strict'

const { getDescribe, getIt, expect } = require('../../utils/mocha')

module.exports = (createCommon, options) => {
  const describe = getDescribe(options)
  const it = getIt(options)
  const common = createCommon()

  describe('.object.patch.setData', function () {
    this.timeout(80 * 1000)

    let ipfs

    before(function (done) {
      // CI takes longer to instantiate the daemon, so we need to increase the
      // timeout for the before step
      this.timeout(60 * 1000)

      common.setup((err, factory) => {
        expect(err).to.not.exist()
        factory.spawnNode((err, node) => {
          expect(err).to.not.exist()
          ipfs = node
          done()
        })
      })
    })

    after((done) => common.teardown(done))

    it('should set data for an existing node', (done) => {
      const obj = {
        Data: Buffer.from('patch test object'),
        Links: []
      }
      const patchData = Buffer.from('set')

      ipfs.object.put(obj, (err, nodeCid) => {
        expect(err).to.not.exist()

        ipfs.object.patch.setData(nodeCid, patchData, (err, patchedNodeCid) => {
          expect(err).to.not.exist()
          expect(nodeCid).to.not.deep.equal(patchedNodeCid)

          ipfs.object.get(patchedNodeCid, (err, patchedNode) => {
            expect(err).to.not.exist()
            expect(patchedNode.Data).to.eql(patchData)
            done()
          })
        })
      })
    })

    it('should set data for an existing node (promised)', async () => {
      const obj = {
        Data: Buffer.from('patch test object (promised)'),
        Links: []
      }
      const patchData = Buffer.from('set')

      const nodeCid = await ipfs.object.put(obj)
      const patchedNodeCid = await ipfs.object.patch.setData(nodeCid, patchData)
      const patchedNode = await ipfs.object.get(patchedNodeCid)

      expect(nodeCid).to.not.deep.equal(patchedNodeCid)
      expect(patchedNode.Data).to.eql(patchData)
    })

    it('returns error for request without key & data', () => {
      return ipfs.object.patch.setData(null, null)
        .then(
          () => expect.fail('should have returned an error for invalid argument'),
          (err) => expect(err).to.be.an.instanceof(Error)
        )
    })

    it('returns error for request without data', () => {
      const filePath = 'test/fixtures/test-data/badnode.json'

      return ipfs.object.patch.setData(null, filePath)
        .then(
          () => expect.fail('should have returned an error for invalid argument'),
          (err) => expect(err).to.be.an.instanceof(Error)
        )
    })
  })
}
