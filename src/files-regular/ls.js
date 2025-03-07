/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 6] */
'use strict'

const { fixtures } = require('./utils')
const { getDescribe, getIt, expect } = require('../utils/mocha')
const CID = require('cids')

const randomName = prefix => `${prefix}${Math.round(Math.random() * 1000)}`

module.exports = (createCommon, options) => {
  const describe = getDescribe(options)
  const it = getIt(options)
  const common = createCommon()

  describe('.ls', function () {
    this.timeout(40 * 1000)

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

    it('should ls with a base58 encoded CID', function (done) {
      const content = (name) => ({
        path: `test-folder/${name}`,
        content: fixtures.directory.files[name]
      })

      const emptyDir = (name) => ({ path: `test-folder/${name}` })

      const dirs = [
        content('pp.txt'),
        content('holmes.txt'),
        content('jungle.txt'),
        content('alice.txt'),
        emptyDir('empty-folder'),
        content('files/hello.txt'),
        content('files/ipfs.txt'),
        emptyDir('files/empty')
      ]

      ipfs.add(dirs, (err, res) => {
        expect(err).to.not.exist()
        const root = res[res.length - 1]

        expect(root.path).to.equal('test-folder')
        expect(root.hash).to.equal(fixtures.directory.cid)

        const cid = 'QmVvjDy7yF7hdnqE8Hrf4MHo5ABDtb5AbX6hWbD3Y42bXP'
        ipfs.ls(cid, (err, files) => {
          expect(err).to.not.exist()

          expect(files).to.eql([
            {
              depth: 1,
              name: 'alice.txt',
              path: 'QmVvjDy7yF7hdnqE8Hrf4MHo5ABDtb5AbX6hWbD3Y42bXP/alice.txt',
              size: 11685,
              hash: 'QmZyUEQVuRK3XV7L9Dk26pg6RVSgaYkiSTEdnT2kZZdwoi',
              type: 'file'
            },
            {
              depth: 1,
              name: 'empty-folder',
              path: 'QmVvjDy7yF7hdnqE8Hrf4MHo5ABDtb5AbX6hWbD3Y42bXP/empty-folder',
              size: 0,
              hash: 'QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn',
              type: 'dir'
            },
            {
              depth: 1,
              name: 'files',
              path: 'QmVvjDy7yF7hdnqE8Hrf4MHo5ABDtb5AbX6hWbD3Y42bXP/files',
              size: 0,
              hash: 'QmZ25UfTqXGz9RsEJFg7HUAuBcmfx5dQZDXQd2QEZ8Kj74',
              type: 'dir'
            },
            {
              depth: 1,
              name: 'holmes.txt',
              path: 'QmVvjDy7yF7hdnqE8Hrf4MHo5ABDtb5AbX6hWbD3Y42bXP/holmes.txt',
              size: 581878,
              hash: 'QmR4nFjTu18TyANgC65ArNWp5Yaab1gPzQ4D8zp7Kx3vhr',
              type: 'file'
            },
            {
              depth: 1,
              name: 'jungle.txt',
              path: 'QmVvjDy7yF7hdnqE8Hrf4MHo5ABDtb5AbX6hWbD3Y42bXP/jungle.txt',
              size: 2294,
              hash: 'QmT6orWioMiSqXXPGsUi71CKRRUmJ8YkuueV2DPV34E9y9',
              type: 'file'
            },
            {
              depth: 1,
              name: 'pp.txt',
              path: 'QmVvjDy7yF7hdnqE8Hrf4MHo5ABDtb5AbX6hWbD3Y42bXP/pp.txt',
              size: 4540,
              hash: 'QmVwdDCY4SPGVFnNCiZnX5CtzwWDn6kAM98JXzKxE3kCmn',
              type: 'file'
            }
          ])
          done()
        })
      })
    })

    it('should ls files added as CIDv0 with a CIDv1', done => {
      const dir = randomName('DIR')

      const input = [
        { path: `${dir}/${randomName('F0')}`, content: Buffer.from(randomName('D0')) },
        { path: `${dir}/${randomName('F1')}`, content: Buffer.from(randomName('D1')) }
      ]

      ipfs.add(input, { cidVersion: 0 }, (err, res) => {
        expect(err).to.not.exist()

        const cidv0 = new CID(res[res.length - 1].hash)
        expect(cidv0.version).to.equal(0)

        const cidv1 = cidv0.toV1()

        ipfs.ls(cidv1, (err, output) => {
          expect(err).to.not.exist()
          expect(output.length).to.equal(input.length)
          output.forEach(({ hash }) => {
            expect(res.find(file => file.hash === hash)).to.exist()
          })
          done()
        })
      })
    })

    it('should ls files added as CIDv1 with a CIDv0', done => {
      const dir = randomName('DIR')

      const input = [
        { path: `${dir}/${randomName('F0')}`, content: Buffer.from(randomName('D0')) },
        { path: `${dir}/${randomName('F1')}`, content: Buffer.from(randomName('D1')) }
      ]

      ipfs.add(input, { cidVersion: 1, rawLeaves: false }, (err, res) => {
        expect(err).to.not.exist()

        const cidv1 = new CID(res[res.length - 1].hash)
        expect(cidv1.version).to.equal(1)

        const cidv0 = cidv1.toV1()

        ipfs.ls(cidv0, (err, output) => {
          expect(err).to.not.exist()
          expect(output.length).to.equal(input.length)
          output.forEach(({ hash }) => {
            expect(res.find(file => file.hash === hash)).to.exist()
          })
          done()
        })
      })
    })

    it('should correctly handle a non existing hash', (done) => {
      ipfs.ls('surelynotavalidhashheh?', (err, res) => {
        expect(err).to.exist()
        expect(res).to.not.exist()
        done()
      })
    })

    it('should correctly handle a non exiting path', (done) => {
      ipfs.ls('QmRNjDeKStKGTQXnJ2NFqeQ9oW/folder_that_isnt_there', (err, res) => {
        expect(err).to.exist()
        expect(res).to.not.exist()
        done()
      })
    })

    it('should ls files by path', done => {
      const dir = randomName('DIR')

      const input = [
        { path: `${dir}/${randomName('F0')}`, content: Buffer.from(randomName('D0')) },
        { path: `${dir}/${randomName('F1')}`, content: Buffer.from(randomName('D1')) }
      ]

      ipfs.add(input, (err, res) => {
        expect(err).to.not.exist()

        ipfs.ls(`/ipfs/${res[res.length - 1].hash}`, (err, output) => {
          expect(err).to.not.exist()
          expect(output.length).to.equal(input.length)
          output.forEach(({ hash }) => {
            expect(res.find(file => file.hash === hash)).to.exist()
          })
          done()
        })
      })
    })
  })
}
