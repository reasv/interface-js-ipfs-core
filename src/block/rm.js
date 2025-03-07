/* eslint-env mocha */
'use strict'

const { getDescribe, getIt, expect } = require('../utils/mocha')
const hat = require('hat')

module.exports = (createCommon, options) => {
  const describe = getDescribe(options)
  const it = getIt(options)
  const common = createCommon()

  describe('.block.rm', function () {
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

    it('should remove by CID object', async () => {
      const cid = await ipfs.dag.put(Buffer.from(hat()), {
        format: 'raw',
        hashAlg: 'sha2-256'
      })

      // block should be present in the local store
      const localRefs = await ipfs.refs.local()
      expect(localRefs).to.have.property('length').that.is.greaterThan(0)
      expect(localRefs.find(ref => ref.ref === cid.toString())).to.be.ok()

      const result = await ipfs.block.rm(cid)
      expect(result).to.be.an('array').and.to.have.lengthOf(1)
      expect(result[0]).to.have.property('hash', cid.toString())
      expect(result[0]).to.not.have.property('error')

      // did we actually remove the block?
      const localRefsAfterRemove = await ipfs.refs.local()
      expect(localRefsAfterRemove).to.have.property('length').that.is.greaterThan(0)
      expect(localRefsAfterRemove.find(ref => ref.ref === cid.toString())).to.not.be.ok()
    })

    it('should remove by CID in string', async () => {
      const cid = await ipfs.dag.put(Buffer.from(hat()), {
        format: 'raw',
        hashAlg: 'sha2-256'
      })
      const result = await ipfs.block.rm(cid.toString())

      expect(result).to.be.an('array').and.to.have.lengthOf(1)
      expect(result[0]).to.have.property('hash', cid.toString())
      expect(result[0]).to.not.have.property('error')
    })

    it('should remove by CID in buffer', async () => {
      const cid = await ipfs.dag.put(Buffer.from(hat()), {
        format: 'raw',
        hashAlg: 'sha2-256'
      })
      const result = await ipfs.block.rm(cid.buffer)

      expect(result).to.be.an('array').and.to.have.lengthOf(1)
      expect(result[0]).to.have.property('hash', cid.toString())
      expect(result[0]).to.not.have.property('error')
    })

    it('should remove multiple CIDs', async () => {
      const cids = [
        await ipfs.dag.put(Buffer.from(hat()), {
          format: 'raw',
          hashAlg: 'sha2-256'
        }),
        await ipfs.dag.put(Buffer.from(hat()), {
          format: 'raw',
          hashAlg: 'sha2-256'
        }),
        await ipfs.dag.put(Buffer.from(hat()), {
          format: 'raw',
          hashAlg: 'sha2-256'
        })
      ]

      const result = await ipfs.block.rm(cids)

      expect(result).to.be.an('array').and.to.have.lengthOf(3)

      result.forEach((res, index) => {
        expect(res).to.have.property('hash', cids[index].toString())
        expect(res).to.not.have.property('error')
      })
    })

    it('should error when removing non-existent blocks', async () => {
      const cid = await ipfs.dag.put(Buffer.from(hat()), {
        format: 'raw',
        hashAlg: 'sha2-256'
      })

      // remove it
      await ipfs.block.rm(cid)

      // remove it again
      const result = await ipfs.block.rm(cid)

      expect(result).to.be.an('array').and.to.have.lengthOf(1)
      expect(result[0]).to.have.property('error').and.to.include('block not found')
    })

    it('should not error when force removing non-existent blocks', async () => {
      const cid = await ipfs.dag.put(Buffer.from(hat()), {
        format: 'raw',
        hashAlg: 'sha2-256'
      })

      // remove it
      await ipfs.block.rm(cid)

      // remove it again
      const result = await ipfs.block.rm(cid, { force: true })

      expect(result).to.be.an('array').and.to.have.lengthOf(1)
      expect(result[0]).to.have.property('hash', cid.toString())
      expect(result[0]).to.not.have.property('error')
    })

    it('should return empty output when removing blocks quietly', async () => {
      const cid = await ipfs.dag.put(Buffer.from(hat()), {
        format: 'raw',
        hashAlg: 'sha2-256'
      })
      const result = await ipfs.block.rm(cid, { quiet: true })

      expect(result).to.be.an('array').and.to.have.lengthOf(0)
    })

    it('should error when removing pinned blocks', async () => {
      const cid = await ipfs.dag.put(Buffer.from(hat()), {
        format: 'raw',
        hashAlg: 'sha2-256'
      })
      await ipfs.pin.add(cid.toString())

      const result = await ipfs.block.rm(cid)

      expect(result).to.be.an('array').and.to.have.lengthOf(1)
      expect(result[0]).to.have.property('error').and.to.include('pinned')
    })
  })
}
