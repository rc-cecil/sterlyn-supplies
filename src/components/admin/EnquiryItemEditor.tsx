'use client';

import {useRef,useState} from 'react';

type Item={
  name:string;
  quantity:number;
  type?:string;
  finish?:string;
};

type Line={
  key:string;
  index?:number;
  name:string;
  quantity:string;
  finish:string;
  original?:{
    name:string;
    quantity:number;
    finish:string;
  };
  removed?:boolean;
};

export default function EnquiryItemEditor({items}:{items:Item[]}){
  const sequence=useRef(0);

  const [lines,setLines]=useState<Line[]>(()=>items.flatMap(
    (item,index)=>['product','custom'].includes(item.type||'')
      ? [{
          key:'existing-'+index,
          index,
          name:item.name,
          quantity:String(item.quantity),
          finish:item.finish||'',
          original:{
            name:item.name,
            quantity:item.quantity,
            finish:item.finish||''
          }
        }]
      : []
  ));

  const update=(key:string,change:Partial<Line>)=>{
    setLines(current=>current.map(line=>
      line.key===key?{...line,...change}:line
    ));
  };

  const removes=lines.filter(line=>
    line.index!==undefined&&line.removed
  ).map(line=>line.index!);

  const edits=lines.filter(line=>
    line.index!==undefined&&!line.removed&&(
      line.name!==line.original?.name||
      Number(line.quantity)!==line.original?.quantity||
      line.finish!==line.original?.finish
    )
  ).map(line=>({
    index:line.index!,
    name:line.name,
    quantity:Number(line.quantity),
    finish:line.finish
  }));

  const adds=lines.filter(line=>
    line.index===undefined&&!line.removed
  ).map(line=>({
    name:line.name,
    quantity:Number(line.quantity),
    finish:line.finish
  }));

  const activeCount=items.length-removes.length+adds.length;

  return <section className="ops-section">
    <h3>Requested products</h3>
    <p className="ops-caption">
      Correct products and quantities before confirming an order.
      Catalogue references and other enquiry details are preserved.
    </p>

    <input
      type="hidden"
      name="itemChanges"
      value={JSON.stringify({edits,removes,adds})}
      readOnly
    />

    {!lines.length&&
      <p>No product lines yet. Add a product below.</p>
    }

    {lines.map(line=>
      line.removed
        ? <div className="enquiry-product-line" key={line.key}>
            <p>Removed: {line.name}</p>
            <button
              type="button"
              className="button secondary"
              onClick={()=>update(line.key,{removed:false})}
            >
              Undo removal
            </button>
          </div>
        : <div className="enquiry-product-line" key={line.key}>
            <div className="enquiry-product-fields">
              <label className="field">
                <span>Product name</span>
                <input
                  value={line.name}
                  required
                  maxLength={200}
                  onChange={event=>update(line.key,{
                    name:event.target.value
                  })}
                />
              </label>

              <label className="field">
                <span>Quantity</span>
                <input
                  type="number"
                  value={line.quantity}
                  required
                  min={1}
                  max={99}
                  step={1}
                  onChange={event=>update(line.key,{
                    quantity:event.target.value
                  })}
                />
              </label>

              <label className="field">
                <span>Finish / specification</span>
                <input
                  value={line.finish}
                  maxLength={200}
                  onChange={event=>update(line.key,{
                    finish:event.target.value
                  })}
                />
              </label>
            </div>

            <button
              type="button"
              className="button secondary"
              onClick={()=>update(line.key,{removed:true})}
            >
              Remove product
            </button>
          </div>
    )}

    <button
      type="button"
      className="button secondary"
      disabled={activeCount>=40}
      onClick={()=>{
        const key='new-'+(++sequence.current);
        setLines(current=>[...current,{
          key,
          name:'',
          quantity:'1',
          finish:''
        }]);
      }}
    >
      Add product
    </button>

    {activeCount>=40&&
      <p role="status">Maximum of 40 requested items reached.</p>
    }

    <p className="ops-caption">
      Inspiration and Design Studio entries remain unchanged.
    </p>
  </section>;
}
