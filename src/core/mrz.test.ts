import {describe,it,expect} from 'vitest'
import {
  checkDigit,parseMRZ,generateMRZ,DEFAULT_GENERATOR,SAMPLES,
  countryInfo,persianDate,resolveYYMMDD,validISODate,detectFormat,normalizeMRZ,
} from './mrz'

describe('ICAO MRZ arithmetic',()=>{
  it('uses the 7-3-1 official algorithm',()=>{
    expect(checkDigit('L898902C3')).toBe('6')
    expect(checkDigit('740812')).toBe('2')
    expect(checkDigit('120415')).toBe('9')
    expect(checkDigit('')).toBe('0')
  })
  it('detects all official line layouts',()=>{
    expect(detectFormat(normalizeMRZ(SAMPLES.TD1))).toBe('TD1')
    expect(detectFormat(normalizeMRZ(SAMPLES.TD2))).toBe('TD2')
    expect(detectFormat(normalizeMRZ(SAMPLES.TD3))).toBe('TD3')
  })
  it('rejects unsupported characters and lengths',()=>{
    expect(()=>parseMRZ('abc')).toThrow()
    expect(()=>checkDigit('😀')).toThrow()
  })
})
describe('parse specimens',()=>{
  it('parses a TD3 passport with all checksum validations',()=>{
    const r=parseMRZ(SAMPLES.TD3)
    expect(r.format).toBe('TD3')
    expect(r.surname).toBe('ERIKSSON')
    expect(r.givenNames).toBe('ANNA MARIA')
    expect(r.documentNumber).toBe('L898902C3')
    expect(r.issuer).toBe('UTO')
    expect(r.birthISO).toBe('1974-08-12')
    expect(r.checks).toHaveLength(5)
    expect(r.checks.every(c=>c.valid)).toBe(true)
  })
  it('reads TD1 three lines including optional data and checksums',()=>{
    const r=parseMRZ(SAMPLES.TD1)
    expect(r.format).toBe('TD1')
    expect(r.checks).toHaveLength(4)
    expect(r.surname).toBe('ERIKSSON')
    expect(r.nationality).toBe('UTO')
  })
  it('reads TD2 36-character two-line format',()=>{
    const r=parseMRZ(SAMPLES.TD2)
    expect(r.format).toBe('TD2')
    expect(r.checks).toHaveLength(4)
  })
  it('reports tampered check digits rather than trusting the content',()=>{
    const lines=SAMPLES.TD3.split('\n')
    lines[1]=lines[1].slice(0,9)+'9'+lines[1].slice(10)
    const parsed=parseMRZ(lines.join('\n'))
    expect(parsed.valid).toBe(false)
    expect(parsed.checks.some(x=>!x.valid)).toBe(true)
  })
})
describe('generate samples and round trip',()=>{
  for(const format of ['TD1','TD2','TD3'] as const){
    it('generates internally consistent '+format,()=>{
      const code=generateMRZ({...DEFAULT_GENERATOR,format,optional:'TEST'})
      const parsed=parseMRZ(code)
      expect(parsed.format).toBe(format)
      expect(parsed.lines).toHaveLength(format==='TD1'?3:2)
      expect(parsed.lines.every(l=>l.length===(format==='TD1'?30:format==='TD2'?36:44))).toBe(true)
      expect(parsed.valid).toBe(true)
      expect(parsed.checks.every(x=>x.valid)).toBe(true)
    })
  }
  it('rejects invalid dates and Persian script in MRZ',()=>{
    expect(()=>generateMRZ({...DEFAULT_GENERATOR,birthDate:'2026-02-30'})).toThrow()
    expect(()=>generateMRZ({...DEFAULT_GENERATOR,surname:'محمدی'})).toThrow()
    expect(validISODate('2024-02-29')).toBe(true)
  })
})
describe('localization and countries',()=>{
  it('converts dates with UTC persian calendar without a backend',()=>{
    expect(persianDate('2026-03-21')).toContain('۱۴۰۵')
    expect(resolveYYMMDD('740812','birth',new Date('2026-11-01'))).toBe('1974-08-12')
  })
  it('maps ISO alpha-3 country codes to names and flags',()=>{
    expect(countryInfo('IRN').alpha2).toBe('IR')
    expect(countryInfo('DEU').flag).toBe('🇩🇪')
    expect(countryInfo('UTO').alpha2).toBe('')
  })
})
